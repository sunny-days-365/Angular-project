import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
} from '@angular/core';

export interface DropdownOption {
  id: string;
  display: string;
}

@Component({
  selector: 'ntc-display-mode-dropdown',
  templateUrl: './display-mode-dropdown.component.html',
  styleUrls: ['./display-mode-dropdown.component.scss'],
})
export class DisplayModeDropdownComponent {
  @Input() options: DropdownOption[] = [];
  @Input() selectedOption: DropdownOption | null = null;
  @Output() optionSelected = new EventEmitter<DropdownOption>();

  public isOpen = false;
  private clickInsideComponent = false;

  constructor(private elementRef: ElementRef) {}

  /**
   * ドロップダウンを開く/閉じる
   */
  public toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  /**
   * オプションを選択
   */
  public selectOption(option: DropdownOption): void {
    this.selectedOption = option;
    this.optionSelected.emit(option);
    this.isOpen = false;
  }

  /**
   * 外部クリックでドロップダウンを閉じる
   */
  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: MouseEvent): void {
    // クリックされた要素がこのコンポーネント内にあるかチェック
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  /**
   * 現在選択されているオプションの表示テキストを取得
   */
  public getSelectedDisplayText(): string {
    return this.selectedOption?.display || '選択してください';
  }
}
