import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { ImportService } from 'src/app/services/import/import.service';

@Component({
  selector: 'ntc-import-abort [processId] [uid]',
  templateUrl: './abort.component.html',
  styleUrl: './abort.component.scss',
})
export class ImportAbortComponent {
  @Input() processId: string = '';
  @Input() uid: string = '';

  @ViewChild('abortButton')
  abortButton: ElementRef<HTMLDivElement> | undefined;

  @ViewChild('abortModusButton')
  modusButton: ElementRef | undefined;

  // コンストラクタ
  constructor(private importService: ImportService) {}

  public isImportAbortable(): boolean {
    return this.importService.isImportAbortable(this.processId, this.uid);
  }

  // 中止ボタン押下時
  public onAbortClick(): void {
    if (!this.isImportAbortable()) {
      return;
    }
    this.importService.abortImport(this.processId, this.uid);
  }
}
