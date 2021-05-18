import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private mailboxPrefix = '_mailbox';

  // Glow instances and mailboxes
  private glow;
  private relay;
  private mailbox;
  activeMailbox = null;
  mailboxes = [];

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

  constructor(private http: HttpClient) {
    this.initGlow();

  }

  ngOnInit() {
    this.setDefaultRelay();
    this.initRelay(this.relayURL);
    this.initMailboxes();
  }

  // -------------------------
  // Initialization
  // -------------------------

  private initGlow() {
    this.glow = (window as any).glow;
    this.glow.CryptoStorage.startStorageSystem(new this.glow.SimpleStorageDriver());

    this.mailbox = this.glow.MailBox;

    this.glow.setAjaxImpl((url: string, data: string) => {
      const request = this.http.post(url, data, {
        headers: {
          'Accept': 'text/plain',
          'Content-Type': 'text/plain'
        },
        responseType: 'text'
      });

      return request.toPromise();
    });
  }

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

  private initRelay(url: string) {
    this.relay = new this.glow.Relay(url);
  }

  async initMailboxes() {
    // add all mailboxes stored in localStorage
    var mbx_count = 0
    var localKeys = Object.keys(localStorage)
    for (const key of localKeys) {
      if (key.indexOf(this.mailboxPrefix) === 0) {
        mbx_count++
        await this.generateMailbox(localStorage.getItem(key));
      }
    }
    if (mbx_count == 0)
    {
      await this.addMailbox('Alice',null, true)
      await this.addMailbox('Bob',  null, true)
    }
    this.refreshCounter();
  }

  // -------------------------
  // Relays
  // -------------------------

  updateRelay() {
    this.relayURL = this.editingURL;
    this.isEditing = false;
    this.initRelay(this.relayURL);
    // reload messages count from a new server
    this.refreshCounter();
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

    form.reset();
  }

  private async addMailbox(name: string, options?, noRefresh?: boolean) {
    const mbx = await this.generateMailbox(name, options);
    localStorage.setItem(`${this.mailboxPrefix}.${name}`, mbx.identity);
    if (!noRefresh) {
      this.refreshCounter();
    }
  }

  private async generateMailbox(name: string, options?) {
    let mbx = null;
    if (!options) {
      mbx = await this.mailbox.new(name);
    } else if (options.secret) {
      mbx = await this.mailbox.fromSecKey(options.secret.fromBase64(), name);
    } else if (options.seed) {
      mbx = await this.mailbox.fromSeed(options.seed, name);
    } else {
      console.error('Error: incorrect options');
    }

    // share keys among mailboxes
    for (const m of this.mailboxes) {
      await mbx.keyRing.addGuest(m.identity, m.getPubCommKey());
      await m.keyRing.addGuest(mbx.identity, mbx.getPubCommKey());
    }

    this.mailboxes.push(mbx);
    return mbx;
  }

  selectMailbox(mailbox) {
    this.activeMailbox = mailbox;
    this.activeMailbox.recipients = Object.keys(mailbox.keyRing.guestKeys);
    this.getMessages(mailbox);
  }

  async deleteMailbox(mailbox) {
    await this.destroyMailbox(mailbox);
    localStorage.removeItem(`${this.mailboxPrefix}.${mailbox.identity}`);
    this.activeMailbox = null;
  }

  async destroyMailbox(mailbox) {
    const mbx = this.mailboxes.find(m => mailbox.keyRing.storage.root === m.keyRing.storage.root);
    console.log(`Deleting mailbox ${mbx.identity}`);
    await mbx.selfDestruct(true);
    this.mailboxes = this.mailboxes.filter(m => mbx.keyRing.storage.root !== m.keyRing.storage.root);
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
      this.addMailbox(name, null, true);
    }
    this.refreshCounter();
  }

  // -------------------------
  // Glow operations
  // -------------------------

  addPublicKey(mailbox, form: NgForm) {
    const { name, key } = form.controls;
    if (mailbox.keyRing.addGuest(name.value, key.value)) {
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
      await this.messageCount(mbx);
    }
    this.showRefreshLoader = false;
  }

  checkAll(event: { target: HTMLInputElement }) {
    this.activeMailbox.messages.map(message => message.isSelected = event.target.checked);
  }

  async messageCount(mailbox) {
    await mailbox.connectToRelay(this.relay);
    const count = await mailbox.relayCount(this.relay);
    mailbox.messageCount = count;
  }

  async getMessages(mailbox) {
    this.showMessagesLoader = true;
    const messages = await mailbox.getRelayMessages(this.relay);
    mailbox.messages = [];
    for (const msg of messages) {
      if (msg.kind === 'file') {
        msg.data = '📎 File [uploadID: ' + JSON.parse(msg.data).uploadID + ']';
      }
      mailbox.messages.push(msg);
    }
    this.showMessagesLoader = false;
  }

  async sendMessage(mailbox, form: NgForm) {
    const { recipient, message } = form.controls;
    await mailbox.sendToVia(recipient.value, this.relay, message.value);
    this.messageSent = true;
    setTimeout(() => {
      this.messageSent = false;
    }, 3000);
    form.reset();
    this.refreshCounter();
  }

  async deleteMessages(mailbox) {
    const noncesToDelete = mailbox.messages.filter(message => message.isSelected)
      .map(message => message.nonce);
    await mailbox.connectToRelay(this.relay);
    await mailbox.relayDelete(noncesToDelete, this.relay);

    mailbox.messages = mailbox.messages.filter(message => !message.isSelected);

    // Update counter without polling server
    mailbox.messageCount = Object.keys(mailbox.messages).length;
  }
}
