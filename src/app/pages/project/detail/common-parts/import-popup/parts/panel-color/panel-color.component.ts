import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { DEFAULT_COLORS } from 'src/app/helper-utility/import-3d-mode/import-3d-model.definition';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';

@Component({
  selector: 'ntc-import-popup-panel-color',
  templateUrl: './panel-color.component.html',
  styleUrls: ['./panel-color.component.scss'],
})
export class ImportPopupPanelColorComponent
  extends BaseComponent
  implements AfterViewInit
{
  public colorDefault = DEFAULT_COLORS;

  currentColor: string = '#AD1457';

  isAddNew: boolean = false;
  openPanelColor: boolean = false;

  @Input() name: string = '';

  @Output()
  public changeColor: EventEmitter<{ name: string; color: number }> =
    new EventEmitter<{ name: string; color: number }>();

  constructor() {
    super('PanelColorComponent');
  }
  ngAfterViewInit(): void {
    const convertColor = parseInt(this.currentColor.slice(1), 16);

    this.changeColor.emit({ name: this.name, color: convertColor });
  }

  onSelectColor(color: {
    isDefault: boolean;
    color: string;
    isActive: boolean;
  }) {
    this.currentColor = color.color;
    this.colorDefault = this.colorDefault.map((x) => {
      return {
        ...x,
        isActive: x.color === color.color ? true : false,
      };
    });
    const convertColor = parseInt(color.color.slice(1), 16);

    this.changeColor.emit({ name: this.name, color: convertColor });
  }

  togglePanelColor(state: boolean = false) {
    this.openPanelColor = state;
  }
}
