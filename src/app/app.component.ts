import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';

import { Mailbox, NaCl } from '@vault12/glow.ts';

interface MailboxView extends Mailbox {
  counter?: number;
  messages?: any[];
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
  quantity = 5;

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

  async createMailbox(form: NgForm, type: string) {
    const { name, seed, secret } = form.controls;
    switch (type) {
      case 'new':
        await this.addMailbox(name.value);
        break;
      case 'secret':
        await this.addMailbox(name.value, { secret: secret.value });
        break;
      case 'seed':
        await this.addMailbox(name.value, { seed: seed.value });
        break;
      default:
        throw new Error('Mailbox: unknown constructor type');
    }

    await this.refreshCounter();
    form.reset();
  }

  private async addMailbox(name: string, options?) {
    const mbx = await this.generateMailbox(name, options);
    localStorage.setItem(`${this.mailboxPrefix}.${name}`, mbx.identity);
  }

  private async generateMailbox(name: string, options?) {
    let mbx: MailboxView = null;
    if (!options) {
      mbx = await Mailbox.new(name);
    } else if (options.secret) {
      mbx = await Mailbox.fromSecKey(name, options.secret);
    } else if (options.seed) {
      mbx = await Mailbox.fromSeed(name, options.seed);
    } else {
      console.error('Error: incorrect options');
    }

    // share keys among mailboxes
    for (const m of this.mailboxes) {
      await mbx.keyRing.addGuest(m.identity, m.keyRing.getPubCommKey());
      await m.keyRing.addGuest(mbx.identity, mbx.keyRing.getPubCommKey());
    }

    mbx.counter = 0;

    this.mailboxes.push(mbx);
    return mbx;
  }

  selectMailbox(mailbox: MailboxView) {
    this.activeMailbox = mailbox;
    this.activeMailbox.recipients = Array.from(mailbox.keyRing.guests.keys());
    this.getMessages(mailbox);
  }

  async deleteMailbox(mailbox: Mailbox) {
    this.mailboxes = this.mailboxes.filter(m => mailbox.identity !== m.identity);
    await mailbox.selfDestruct();
    localStorage.removeItem(`${this.mailboxPrefix}.${mailbox.identity}`);
    this.activeMailbox = null;
  }

  async addMailboxes(amount: number = 5) {
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

  async addPublicKey(mailbox: Mailbox, form: NgForm) {
    const { name, key } = form.controls;
    if (await mailbox.keyRing.addGuest(name.value, key.value)) {
      this.keyAdded = true;
      setTimeout(() => {
        this.keyAdded = false;
      }, 3000);
    }
    form.reset();
  }

  async refreshCounter() {
    if (!this.mailboxes.length) {
      return;
    }
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

  async getMessages(mailboxView: MailboxView) {
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

  async sendMessage(mailbox: Mailbox, form: NgForm) {
    const { recipient, message } = form.controls;
    await mailbox.connectToRelay(this.relayURL);
    await mailbox.upload(this.relayURL, recipient.value, message.value);
    this.messageSent = true;
    setTimeout(() => {
      this.messageSent = false;
    }, 3000);
    form.reset();
    await this.refreshCounter();
  }

  async deleteMessages(mailbox: MailboxView) {
    const noncesToDelete = mailbox.messages.filter(message => message.isSelected)
      .map(message => message.nonce);
    await mailbox.connectToRelay(this.relayURL);
    await mailbox.delete(this.relayURL, noncesToDelete);

    mailbox.messages = mailbox.messages.filter(message => !message.isSelected);

    // Update counter without polling server
    mailbox.counter = Object.keys(mailbox.messages).length;
  }
}
