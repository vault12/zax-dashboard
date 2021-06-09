import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'nonce'
})
export class NoncePipe implements PipeTransform {
  transform(value: string): string {
    if (value !== undefined && value !== null) {
      // remove special characters from the nonce,
      // because we need alphanumeric value to be used as ID in DOM
      return value.replace(/[^\w\s]/gi, '');
    } else {
      return '';
    }
  }
}