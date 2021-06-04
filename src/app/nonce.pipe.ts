import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'nonce'
})
export class NoncePipe implements PipeTransform {
  transform(val: string): string {
    if (val !== undefined && val !== null) {
      // remove special characters from the nonce, because we need alphanumeric value to be used as ID in DOM
      return val.replace(/[^\w\s]/gi, '');
    } else {
      return '';
    }
  }
}