import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';

@Component({
  selector: 'ntc-pdfviewer-modal [height] [width]',
  templateUrl: './pdfviewer.component.html',
  styleUrl: './pdfviewer.component.scss',
})
/**
 * 使用方法：テンプレートにて下記のように呼び出してください。
 * <ntc-pdfviewer-modal
 *  #pdfViewer
 *  title="sample"
 *  src="https://vadimdez.github.io/ng2-pdf-viewer/assets/pdf-test.pdf"
 *  [height]="'85vh'"
 *  [pdfWidth]="'100%'"
 *  [pdfHeight]="'100%'"
 * ></ntc-pdfviewer-modal>
 *
 * パラメータ：
 * https://www.npmjs.com/package/ng2-pdf-viewer#zoom
 */
export class PdfViewerModalComponent
  extends BaseComponent
  implements OnDestroy
{
  // Modal関連のプロパティ
  @Input() public title: string | undefined;
  @Input() public width: number | string | undefined = undefined;
  @Input() public height: number | string | undefined = undefined;
  @Input() public zIndex: number = 4001;
  @Input() public noOverlay: boolean = false;
  @Input() public fullscreen: boolean = false;

  // PDF関連のプロパティ
  @Input() public src: string | undefined;
  @Input() public showAll: boolean = true;
  @Input() public page: number | undefined;
  @Input() public autoresize: boolean = true;
  @Input() public originalSize: boolean = false;
  @Input() public fitToPage: boolean = false;
  @Input() public showBorders: boolean = true;
  @Input() public zoom: number = 1;
  @Input() public renderText: boolean = true;
  @Input() public pdfHeight: number | string | undefined = '100%';
  @Input() public pdfWidth: number | string | undefined = '100%';

  // モーダルの状態管理
  protected isOpen: boolean = false;
  private initialZoom: number = 1;

  // パン機能用プロパティ
  @ViewChild('pdfViewerElement', { read: ElementRef })
  pdfViewerElement!: ElementRef<HTMLElement>;
  protected isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private scrollLeft: number = 0;
  private scrollTop: number = 0;
  // スムーズパン用: requestAnimationFrame ID
  private animationFrameId: number | null = null;
  private pendingDeltaX: number = 0;
  private pendingDeltaY: number = 0;

  get openClass() {
    return this.isOpen ? 'flex' : 'none';
  }

  constructor(
    private cdRef: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {
    super('PdfViewerModalComponent');
  }

  override ngOnDestroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    document.body.style.overflow = '';
    super.ngOnDestroy();
  }

  /**
   * PDFViewer - 開くボタン
   */
  public open() {
    document.body.style.overflow = 'hidden';
    this.initialZoom = this.zoom;
    this.isOpen = true;
    this.cdRef.detectChanges();
    return;
  }

  /**
   * PDFViewer - キャンセル/閉じるボタン
   */
  public onClose() {
    this.isOpen = false;
    this.cdRef.detectChanges();
    return;
  }

  onZoomPlus() {
    this.zoom += 0.1;
  }

  onZoomMinus() {
    this.zoom -= 0.1;
  }

  onZoomReset() {
    this.zoom = this.initialZoom;
  }

  // pdf-viewer内部のスクロールコンテナを取得
  private getScrollContainer(): HTMLElement | null {
    if (!this.pdfViewerElement) return null;
    // ng2-pdf-viewerの内部スクロールコンテナを探す
    return this.pdfViewerElement.nativeElement.querySelector(
      '.ng2-pdf-viewer-container',
    );
  }

  // パン機能
  onPanStart(event: PointerEvent) {
    const container = this.getScrollContainer();
    if (!container) return;
    event.preventDefault();
    this.isPanning = true;
    this.panStartX = event.clientX;
    this.panStartY = event.clientY;
    this.scrollLeft = container.scrollLeft;
    this.scrollTop = container.scrollTop;

    // ポインターキャプチャ: 要素外に出てもイベントを受け取り続ける
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPanMove(event: PointerEvent) {
    if (!this.isPanning) return;
    event.preventDefault();

    this.pendingDeltaX = event.clientX - this.panStartX;
    this.pendingDeltaY = event.clientY - this.panStartY;

    // requestAnimationFrameで次の描画タイミングに同期
    if (this.animationFrameId === null) {
      this.ngZone.runOutsideAngular(() => {
        this.animationFrameId = requestAnimationFrame(() => {
          this.updateScroll();
        });
      });
    }
  }

  private updateScroll() {
    const container = this.getScrollContainer();
    if (container) {
      container.scrollLeft = this.scrollLeft - this.pendingDeltaX;
      container.scrollTop = this.scrollTop - this.pendingDeltaY;
    }
    this.animationFrameId = null;
  }

  onPanEnd() {
    this.isPanning = false;
    // 保留中のアニメーションフレームをキャンセル
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
