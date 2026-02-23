import { BaseComponent } from '@nikon-trimble-sok/parts-components';

import {
  Component,
  Input,
  Output,
  EventEmitter,
  SimpleChanges,
  OnChanges,
} from '@angular/core';

@Component({
  selector:
    'ntc-project-detail-data-3d-view-parts-file-tree-view-filter-bar-multi-selector',
  templateUrl: './multi-selector.component.html',
  styleUrls: ['./multi-selector.component.scss'],
})
export class FilterMultiSelectorComponent
  extends BaseComponent
  implements OnChanges
{
  @Input() label: string = '';
  @Input() options: string[] = [];
  @Input() size: 'lg' | 'md' = 'md';
  @Input() menuPosition: 'left' | 'right' = 'left';
  @Input() showBlankItemCheckbox: boolean = false;
  @Input() blankItemCheckboxLabel: string = '';
  @Output() selectedIndexesChange = new EventEmitter<number[]>();
  @Input() isRight: boolean = false;
  @Input() selectedIndexes: number[] = [];

  public expanded: boolean = false;
  public showBlankItem: boolean = false;
  private defaultOption: string | undefined = undefined;
  private defaultOptionUnset: boolean = true;

  constructor() {
    super('FilterMultiSelectorComponent');
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.defaultOptionUnset && changes['options']) {
      if (this.options.length && this.defaultOption) {
        this.defaultOptionUnset = false;
        if (this.options.includes(this.defaultOption)) {
          const index = this.options.indexOf(this.defaultOption);
          setTimeout(() => {
            this.onOptionSelect(index);
          }, 0);
        }
      }
    }
  }

  public setDefaultOption(option: string | undefined) {
    this.defaultOption = option;
  }

  toggleExpand() {
    document
      .querySelectorAll('.multi-selector__menu modus-checkbox')
      .forEach((item) => {
        const label = item.shadowRoot && item.shadowRoot.querySelector('label');
        if (label) {
          label.style.display = 'inline-block';
          label.style.maxWidth = '120px';
          label.style.overflow = 'hidden';
          label.style.textOverflow = 'ellipsis';
        }
      });

    this.expanded = !this.expanded;
  }

  onOptionSelect(index: number) {
    const selectedIndex = this.selectedIndexes.indexOf(index);
    if (selectedIndex === -1) {
      this.selectedIndexes.push(index);
    } else {
      this.selectedIndexes.splice(selectedIndex, 1);
    }
    this.selectedIndexes.sort((a, b) => a - b);
    this.selectedIndexesChange.emit([...this.selectedIndexes]);
  }

  getSelectedOptionsLabel(): string {
    if (this.selectedIndexes.length === 0) {
      return this.label;
    }
    if (this.showBlankItem) {
      if (this.selectedIndexes.length === 1) {
        return this.blankItemCheckboxLabel;
      }
      return this.options[this.selectedIndexes[1]];
    }
    return this.options[this.selectedIndexes[0]];
  }

  getSelectedOptionsPlusCount(): string {
    if (this.selectedIndexes.length > 1) {
      return `(+${this.selectedIndexes.length - 1})`;
    }
    return '';
  }

  hasNoSelectedOptions(): boolean {
    if (this.showBlankItem) {
      return this.selectedIndexes.length === 1;
    }
    return this.selectedIndexes.length === 0;
  }

  clearSelection() {
    this.showBlankItem = false;
    this.selectedIndexes = [];
    this.selectedIndexesChange.emit([...this.selectedIndexes]);
  }

  isChecked(index: number): boolean {
    return this.selectedIndexes.includes(index);
  }

  toggleBlankItem() {
    this.showBlankItem = !this.showBlankItem;
    if (this.showBlankItem) {
      this.selectedIndexes.push(-1);
    } else {
      this.selectedIndexes = this.selectedIndexes.filter((i) => i !== -1);
    }
    this.selectedIndexes.sort((a, b) => a - b);
    this.selectedIndexesChange.emit([...this.selectedIndexes]);
  }
}
