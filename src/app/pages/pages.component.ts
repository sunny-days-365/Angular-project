import { Component } from '@angular/core';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';

@Component({
  selector: 'ntc-app-pages',
  templateUrl: './pages.component.html',
  styleUrl: './pages.component.scss',
})
export class PagesComponent extends BaseComponent {
  constructor() {
    super('PagesComponent');
  }
}
