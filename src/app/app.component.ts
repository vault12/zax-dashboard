import { Component, OnInit } from '@angular/core';
import { Mailbox, NaCl, ZaxParsedMessage } from '@vault12/glow.ts';

type MessageView = ZaxParsedMessage & { isSelected?: boolean };

interface MailboxView extends Mailbox {
  counter?: number;
  messages?: MessageView[];
  recipients?: string[];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private mailboxPrefix = '_mailbox';

  activeMailbox?: MailboxView = null;
  mailboxes: MailboxView[] = [];

  // UI flags
  showRefreshLoader = false;
  showMessagesLoader = false;
  messageSent = false;
  keyAdded = false;
  isEditing = false;

  // UI defaults
  relayURL: string;
  editingURL: string;
  newMailboxSubscreen = 'new';
  viewMailboxSubscreen = 'inbox';

  async ngOnInit(): Promise<void> {
    NaCl.setInstance();
    this.setDefaultRelay();
    await this.initMailboxes();
  }

  // -------------------------
  // Initialization
  // -------------------------

  private setDefaultRelay() {
    if (window.location.origin.indexOf('github.io') > -1) {
      // Use test server by default when running on http://vault12.github.io/zax-dashboard/
      this.relayURL = 'https://z.vault12.com';
    } else {
      // Use current location otherwise
      // NOTE: Take care not to mix up ports when both are running locally
      this.relayURL = 'https://z2.vault12.com'; //window.location.origin;
    }
    this.editingURL = this.relayURL;
  }

  async initMailboxes(): Promise<void> {
    // add all mailboxes stored in localStorage
    const localKeys = Object.keys(localStorage).filter(key => key.startsWith(this.mailboxPrefix));
    for (const key of localKeys) {
      await this.generateMailbox(localStorage.getItem(key));
    }
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
  // Mailboxes
  // -------------------------

  async createMailbox(name: string, seed?: string, secret?: string): Promise<void> {
    if (seed) {
      await this.addMailbox(name, { seed });
    } else if (secret) {
      await this.addMailbox(name, { secret });
    } else {
      await this.addMailbox(name);
    }

    await this.refreshCounter();
  }

  private async addMailbox(name: string, options?: { seed?: string, secret?: string }) {
    const mbx = await this.generateMailbox(name, options);
    localStorage.setItem(`${this.mailboxPrefix}.${name}`, mbx.identity);
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

  async selectMailbox(mailbox: MailboxView): Promise<void> {
    this.activeMailbox = mailbox;
    this.activeMailbox.recipients = Array.from(mailbox.keyRing.guests.keys());
    await this.getMessages(mailbox);
  }

  async deleteMailbox(mailbox: Mailbox): Promise<void> {
    this.mailboxes = this.mailboxes.filter(m => mailbox.identity !== m.identity);
    for (const mbx of this.mailboxes) {
      await mbx.keyRing.removeGuest(mailbox.identity);
    }
    await mailbox.selfDestruct();
    localStorage.removeItem(`${this.mailboxPrefix}.${mailbox.identity}`);
    this.activeMailbox = null;
  }

  async addMailboxes(amount = 5): Promise<void> {
    // sort names randomly
    const firstNames = ['Alice', 'Bob', 'Charlie', 'Chuck', 'Dave', 'Erin',
      'Eve', 'Faith', 'Frank', 'Mallory', 'Oscar', 'Peggy', 'Pat', 'Sam',
      'Sally', 'Sybil', 'Trent', 'Trudy', 'Victor', 'Walter', 'Wendy']
      .sort(() => .5 - Math.random()).slice(0, amount);

    for (let name of firstNames) {
      // check if name is on the list already
      const i = this.mailboxes.filter(m => m.identity.indexOf(name) > -1).length + 1;
      // add index if it's on the list
      if (i > 1) {
        name = `${name} ${i}`;
      }
      await this.addMailbox(name);
    }
    await this.refreshCounter();
  }

  // -------------------------
  // Glow operations
  // -------------------------

  async addPublicKey(mailbox: MailboxView, name: string, key: string): Promise<void> {
    if (await mailbox.keyRing.addGuest(name, key)) {
      this.keyAdded = true;
      setTimeout(() => {
        this.keyAdded = false;
      }, 3000);
    }
  }

  async refreshCounter(): Promise<void> {
    this.showRefreshLoader = true;
    for (const mbx of this.mailboxes) {
      await mbx.connectToRelay(this.relayURL);
      mbx.counter = await mbx.count(this.relayURL);
    }
    this.showRefreshLoader = false;
  }

  checkAll(event: { target: HTMLInputElement }): void {
    this.activeMailbox.messages.map(message => message.isSelected = event.target.checked);
  }

  hasSelectedMessages(): boolean {
    return !!this.activeMailbox?.messages?.find(message => message.isSelected);
  }

  async getMessages(mailboxView: MailboxView): Promise<void> {
    this.showMessagesLoader = true;
    await mailboxView.connectToRelay(this.relayURL);
    const messages = await mailboxView.download(this.relayURL);
    mailboxView.messages = [];
    for (const msg of messages) {
      // TOOO: support ZaxMessageKind.file
      /* if (msg.kind === 'file') {
        msg.data = '📎 File [uploadID: ' + JSON.parse(msg.data).uploadID + ']';
      }*/
      mailboxView.messages.push(msg);
    }
    this.showMessagesLoader = false;
  }

  async sendMessage(mailbox: MailboxView, guest: string, message: string): Promise<void> {
    await mailbox.connectToRelay(this.relayURL);
    await mailbox.upload(this.relayURL, guest, message);
    this.messageSent = true;
    setTimeout(() => {
      this.messageSent = false;
    }, 3000);
    await this.refreshCounter();
  }

  async deleteMessages(mailbox: MailboxView): Promise<void> {
    const noncesToDelete = mailbox.messages.filter(message => message.isSelected)
      .map(message => message.nonce);
    await mailbox.connectToRelay(this.relayURL);
    await mailbox.delete(this.relayURL, noncesToDelete);

    mailbox.messages = mailbox.messages.filter(message => !message.isSelected);

    // Update counter without polling server
    mailbox.counter = Object.keys(mailbox.messages).length;
  }
}
