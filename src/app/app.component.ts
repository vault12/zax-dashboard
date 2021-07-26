import { Component, OnInit } from '@angular/core';
import { Mailbox, NaCl, ZaxParsedMessage, ZaxMessageKind, ZaxFileMessage, CryptoStorage } from 'glow.ts';

// Glow type extensions to represent data downloaded from the relay conveniently
type MessageView = ZaxParsedMessage & { isSelected?: boolean };
interface MailboxView extends Mailbox {
  counter?: number;
  messages?: MessageView[];
  recipients?: string[];
}

enum UIAction {
  keyAdded,
  mailboxCreated,
  messageSent,
  fileSent
}

// Set by default on Zax relays, hardcoded here for simplicity.
// However for multi-chunk uploads it's better to rely on `max_chunk_size` value,
// received from `startFileUpload` call
const maxFileSize = 512000;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  // Needed to find in local storage and load all previously generated mailboxes
  private readonly mailboxPrefix = '_mailbox';

  // Cached mailbox and file data
  mailboxes: MailboxView[] = [];
  activeMailbox: MailboxView = null;
  selectedFile: File;

  ZaxMessageKind = ZaxMessageKind;

  // UI defaults
  UIAction = UIAction;
  UIFlags = {
    [UIAction.keyAdded]: false,
    [UIAction.mailboxCreated]: false,
    [UIAction.messageSent]: false,
    [UIAction.fileSent]: false
  };
  relayURL: string;
  editingURL: string;
  isEditing = false;
  showNewMailboxScreen = false;
  showMessagesLoading = false;
  showCounterLoading = false;
  newMailboxSubscreen = 'new';
  viewMailboxSubscreen = 'inbox';

  // -------------------------
  // Initialization
  // -------------------------

  async ngOnInit(): Promise<void> {
    NaCl.setDefaultInstance();
    CryptoStorage.setDefaultStorageDriver();
    this.setDefaultRelay();
    await this.initMailboxes();
  }

  private setDefaultRelay() {
    if (window.location.origin.indexOf('github.io') > -1 || window.location.origin.indexOf('localhost') > -1) {
      // Use test server by default when running on http://vault12.github.io/zax-dashboard/ or locally
      this.relayURL = 'https://zt.vault12.com';
    } else {
      // Use current location otherwise
      // NOTE: Take care not to mix up ports when both are running locally
      this.relayURL = window.location.origin;
    }
    this.editingURL = this.relayURL;
  }

  private async initMailboxes(): Promise<void> {
    // add all mailboxes stored in localStorage
    const localKeys = Object.keys(localStorage).filter(key => key.startsWith(this.mailboxPrefix));
    for (const key of localKeys) {
      await this.generateMailbox(localStorage.getItem(key));
    }
    // otherwise, start with two empty mailboxes
    if (!localKeys.length) {
      await this.addMailbox('Alice');
      await this.addMailbox('Bob');
    }
    await this.refreshCounter();
  }

  // -------------------------
  // Relays
  // -------------------------

  async updateRelay(): Promise<void> {
    this.relayURL = this.editingURL;
    this.isEditing = false;
    // reload messages count from a new server
    await this.refreshCounter();
  }

  // -------------------------
  // Mailbox operations
  // -------------------------

  /**
   * Create a new mailbox based on user's input and fetch the number of messages in it
   */
  async createMailbox(name: string, seed?: string, secret?: string): Promise<void> {
    let mailboxName = null;
    if (seed) {
      mailboxName = await this.addMailbox(name, { seed });
    } else if (secret) {
      mailboxName = await this.addMailbox(name, { secret });
    } else {
      mailboxName = await this.addMailbox(name);
    }

    this.showBadge(UIAction.mailboxCreated);
    await this.refreshCounter([mailboxName]);
  }

  /**
   * Delete the Mailbox from local storage, remove it on UI, and remove its keys
   * from keyrings of other mailboxes
   */
  async deleteMailbox(mailbox: MailboxView): Promise<void> {
    this.mailboxes = this.mailboxes.filter(m => mailbox.identity !== m.identity);
    for (const mbx of this.mailboxes) {
      await mbx.keyRing.removeGuest(mailbox.identity);
    }
    await mailbox.selfDestruct();
    localStorage.removeItem(`${this.mailboxPrefix}.${mailbox.identity}`);
    this.activeMailbox = null;
  }

  /**
   * Auto-generate the defined amount of random Mailboxes
   */
  async addMultipleMailboxes(amount = 5): Promise<void> {
    // sort names randomly and pick `amount` of them
    const firstNames = ['Alice', 'Bob', 'Charlie', 'Chuck', 'Dave', 'Erin',
      'Eve', 'Faith', 'Frank', 'Mallory', 'Oscar', 'Peggy', 'Pat', 'Sam',
      'Sally', 'Sybil', 'Trent', 'Trudy', 'Victor', 'Walter', 'Wendy']
      .sort(() => .5 - Math.random()).slice(0, amount);

    // create multiple mailboxes
    const mailboxes = await Promise.all(
      firstNames.map(async (name) => await this.addMailbox(this.ensureUniqueName(name)))
    );

    // fetch message count for these new mailboxes only
    await this.refreshCounter(mailboxes);
  }

  /**
   * Display the Mailbox on UI
   */
  async selectMailbox(mailbox: MailboxView): Promise<void> {
    this.activeMailbox = mailbox;
    this.activeMailbox.recipients = Array.from(mailbox.keyRing.guests.keys());
    await this.getMessages(mailbox);
  }

  /**
   * Add a new guest to the currently selected mailbox
   */
  async addPublicKey(name: string, key: string): Promise<void> {
    await this.activeMailbox.keyRing.addGuest(name, key);
    this.showBadge(UIAction.keyAdded);
    await this.selectMailbox(this.activeMailbox);
  }

  /**
   * Fetch the number of messages in all mailboxes, or in specifies ones
   */
  async refreshCounter(mailboxNames?: string[]): Promise<void> {
    this.showCounterLoading = true;
    // take either chosen names, or all mailboxes
    const mailboxes = mailboxNames ?
      this.mailboxes.filter(mailbox => mailboxNames.includes(mailbox.identity)) : this.mailboxes;
    for (const mbx of mailboxes) {
      await mbx.connectToRelay(this.relayURL);
      mbx.counter = await mbx.count(this.relayURL);
    }
    this.showCounterLoading = false;
  }

  private async addMailbox(name: string, options?: { seed?: string, secret?: string }): Promise<string> {
    name = this.ensureUniqueName(name);
    const mbx = await this.generateMailbox(name, options);
    localStorage.setItem(`${this.mailboxPrefix}.${name}`, mbx.identity);
    return name;
  }

  private async generateMailbox(name: string, options?: { seed?: string, secret?: string }) {
    let mbx: MailboxView = null;
    if (options?.seed) {
      mbx = await Mailbox.fromSeed(name, options.seed);
    } else if (options?.secret) {
      mbx = await Mailbox.fromSecKey(name, options.secret);
    } else {
      mbx = await Mailbox.new(name);
    }

    // share keys among mailboxes
    for (const m of this.mailboxes) {
      await mbx.keyRing.addGuest(m.identity, m.keyRing.getPubCommKey());
      await m.keyRing.addGuest(mbx.identity, mbx.keyRing.getPubCommKey());
    }

    this.mailboxes.push(mbx);
    return mbx;
  }

  private ensureUniqueName(name: string): string {
    // check if name is on the list already
    const i = this.mailboxes.filter(m => m.identity.indexOf(name) > -1).length + 1;
    // add index if it's on the list
    return (i > 1) ? `${name} ${i}` : name;
  }

  // -------------------------
  // Message operations
  // -------------------------

  /**
   * Fetch messages in a given mailbox from the relay
   */
  async getMessages(mailboxView: MailboxView): Promise<void> {
    this.showMessagesLoading = true;
    await mailboxView.connectToRelay(this.relayURL);
    mailboxView.messages = await mailboxView.download(this.relayURL);
    this.showMessagesLoading = false;
  }

  /**
   * Send an encrypted text message to a specified guest
   */
  async sendMessage(guest: string, message: string): Promise<void> {
    await this.activeMailbox.connectToRelay(this.relayURL);
    await this.activeMailbox.upload(this.relayURL, guest, message);
    this.showBadge(UIAction.messageSent);
    await this.refreshCounter();
  }

  /**
   * Delete selected messages and files from the relay
   */
  async deleteMessages(): Promise<void> {
    const messagesToDelete = this.activeMailbox.messages.filter(message => message.isSelected);
    const noncesToDelete = messagesToDelete.map(message => message.nonce);
    const fileIDsToDelete = messagesToDelete
      .filter(message => message.kind === ZaxMessageKind.file)
      .map((message: ZaxFileMessage) => message.uploadID);

    // Delete files before deleting file messages
    await this.activeMailbox.connectToRelay(this.relayURL);
    for (const uploadID of fileIDsToDelete) {
      await this.activeMailbox.deleteFile(this.relayURL, uploadID);
    }

    // Delete file messages
    await this.activeMailbox.delete(this.relayURL, noncesToDelete);

    // Update messages list and counter without polling server
    this.activeMailbox.messages = this.activeMailbox.messages.filter(message => !message.isSelected);
    this.activeMailbox.counter = Object.keys(this.activeMailbox.messages).length;
  }

  // -------------------------
  // File operations
  // -------------------------

  /**
   * Send an encrypted file to a specified guest. Only single chunk is allowed for simplicity
   */
  async sendFile(guest: string): Promise<void> {
    if (!this.selectedFile) {
      return;
    }

    if (this.selectedFile.size >= maxFileSize) {
      alert(`Error, maximum file size is ${maxFileSize} bytes`);
      return;
    }

    const binary = new Uint8Array(await this.selectedFile.arrayBuffer());
    const metadata = {
      name: this.selectedFile.name,
      orig_size: this.selectedFile.size,
      modified: this.selectedFile.lastModified
    };

    await this.activeMailbox.connectToRelay(this.relayURL);
    const { skey, uploadID } = await this.activeMailbox.startFileUpload(this.relayURL, guest, metadata);

    await this.activeMailbox.uploadFileChunk(this.relayURL, uploadID, binary, 0, 1, skey);
    this.showBadge(UIAction.fileSent);
    await this.refreshCounter();
  }

  /**
   * Download the file and trigger browser's download capability
   */
  async downloadFile(message: ZaxFileMessage): Promise<void> {
    await this.activeMailbox.connectToRelay(this.relayURL);
    const status = await this.activeMailbox.getFileStatus(this.relayURL, message.uploadID);
    if (status.status !== 'COMPLETE') {
      alert('This file is not yet ready to be downloaded, please re-upload it again');
    }

    const blob = new Uint8Array(status.file_size);
    let writtenBytes = 0;

    for (let i = 0; i < status.total_chunks; i++) {
      const chunk = await this.activeMailbox.downloadFileChunk(this.relayURL,
        message.uploadID, i, message.data.skey);
      blob.set(chunk, writtenBytes);
      writtenBytes += chunk.length;
    }

    // DOM trick to let browser start downloading the binary file
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    // Use original file name
    link.setAttribute('download', message.data.name);
    document.body.appendChild(link);
    link.click();
  }

  // -------------------------
  // UI helpers
  // -------------------------

  selectAllMessages(target: HTMLInputElement): void {
    this.activeMailbox.messages.map(message => message.isSelected = target.checked);
  }

  hasSelectedMessages(): boolean {
    return !!this.activeMailbox.messages?.find(message => message.isSelected);
  }

  private showBadge(action: UIAction) {
    this.UIFlags[action] = true;
    setTimeout(() => {
      this.UIFlags[action] = false;
    }, 3000);
  }
}
