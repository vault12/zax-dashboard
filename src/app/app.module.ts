import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { AppComponent } from './app.component';
import { NoncePipe } from './nonce.pipe';
import { RouterModule } from '@angular/router';

@NgModule({ declarations: [
        AppComponent,
        NoncePipe
    ],
    bootstrap: [AppComponent], imports: [BrowserModule,
        FormsModule,
        RouterModule.forRoot([{ path: '**', redirectTo: '' }])], providers: [provideHttpClient(withInterceptorsFromDi())] })
export class AppModule {}
