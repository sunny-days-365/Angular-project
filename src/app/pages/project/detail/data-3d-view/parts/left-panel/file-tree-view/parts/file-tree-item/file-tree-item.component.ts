import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { ModusModal } from '@trimble-oss/modus-angular-components';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { ModelPropertyViewAction } from 'src/app/stores/actions/project/detail/data-3d-view/right-panel/model-property/model-property-view.action';
import { Data3dViewWideAction } from 'src/app/stores/actions/project/detail/data-3d-view/data-3d-view-wide.action';
import { PointListPanelAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/point-list-panel/point-list-panel.action';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import {
  FileForView,
  TcModelFileInfo,
} from 'src/app/stores/states/project/detail/data-3d-view/left-panel/file-tree-view/file-tree-view.state';
import {
  ModelActionItem,
  TREE_ITEM_ACTIONS,
  TREE_ITEM_ACTION_KEYS,
  POINT_LIST_ACTION,
  TOPOGRAPHY_ACTION,
  OPEN_DELETE_MODEL,
  RESTORE_FROM_TRASH,
  ModelCheckedType,
  BACKGROUND_MAP_MODEL_NAME,
} from './file-tree-item.definition';
import { Data3DViewHelperService } from '../../../../../data-3d-view.service';
import { ProjectAccessControlService } from 'src/app/services/project/project-access-control.service';
import {
  EnumModelCateModelType,
  LockFuncName,
  ModelCategoryType,
} from 'src/app/helper-utility/api-helper/projects-models';
import { ModelStatusTypes, ModelTypes } from '@nikon-trimble-sok/api-sdk-d3';
import { ModelIcons } from './file-tree-item.definition';
import { extractAppMessage } from '@nikon-trimble-sok/common';
import { MultiSelectDataItem } from '@nikon-trimble-sok/parts-components';
import { TagRelation } from 'src/app/stores/definitions/definition';

@Component({
  selector: 'ntc-project-detail-data-3d-view-parts-tree-item',
  templateUrl: './file-tree-item.component.html',
  styleUrls: ['./file-tree-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeFileItemViewComponent extends BaseComponent {
  public treeItemActions: ModelActionItem[] = TREE_ITEM_ACTIONS;

  public ModelTypes = ModelTypes;
  public ModelIcons = ModelIcons;

  @ViewChild('confirmDeleteFileOrFolder')
  confirmDeleteFileOrFolder: ModusModal | undefined;

  @ViewChild('confirmMoveToTrash')
  confirmMoveToTrash: ModusModal | undefined;

  @ViewChild('actionElement') actionElement!: ElementRef;
  @ViewChild('menuElement') menuElement!: ElementRef;

  // Model info
  @Input() model: FileForView | undefined;

  // Status is loading in 3d view
  @Input() isLoading: boolean | undefined;

  // Status is loaded in 3d view
  @Input() isLoaded: boolean | undefined;

  // Status is unload in 3d view
  @Input() isUnload: boolean | undefined;

  // Status is failed in 3d view
  @Input() isFailed: boolean | undefined;

  // Status is assimilating in 3d view
  @Input() isAssimilating: boolean | undefined;

  // Status is assimilationBusy in 3d view
  @Input() isAssimilationBusy: boolean | undefined;

  // Trimble connect file info
  @Input() modelTcFileInfo: TcModelFileInfo | undefined;

  @Input() modelKind: string | undefined;

  @Input() isEditMode: boolean = false;

  @Input() checked: boolean = false;

  // タグ表示関連のInput
  @Input() isTagEditMode: boolean = false;
  @Input() shouldShowTagChips: boolean = false;
  @Input() tagSources: MultiSelectDataItem[] = [];
  @Input() tagRelation: TagRelation = {};

  // Emit event select model
  @Output()
  public modelSelected: EventEmitter<FileForView> = new EventEmitter();

  // Emit event show detail model
  @Output()
  public showProperty: EventEmitter<FileForView> = new EventEmitter();

  @Output()
  public showEditForm: EventEmitter<FileForView> = new EventEmitter();

  @Output()
  public showExportPanel: EventEmitter<FileForView> = new EventEmitter();

  @Output()
  public showHeightChangePanel: EventEmitter<FileForView> = new EventEmitter();

  @Output()
  public showConstructionTopography: EventEmitter<FileForView> =
    new EventEmitter();

  @Output()
  public moveToTrash: EventEmitter<FileForView> = new EventEmitter();

  @Output()
  public restore: EventEmitter<FileForView> = new EventEmitter();

  @Output()
  public modelCheck: EventEmitter<ModelCheckedType> = new EventEmitter();

  @Output()
  public moveToTrashMulti: EventEmitter<void> = new EventEmitter();

  @Output()
  public restoreFromTrashMulti: EventEmitter<void> = new EventEmitter();

  @Output()
  public openDeleteModalMulti: EventEmitter<void> = new EventEmitter();

  @Output()
  public tagClicked: EventEmitter<string> = new EventEmitter();

  public menuExpanded: boolean = false;

  public checkLocks: boolean = false;

  public errorMessage: string | undefined = undefined;

  constructor(
    private store: Store<ApplicationState>,
    private data3DViewHelperService: Data3DViewHelperService,
    public projectAccessControlService: ProjectAccessControlService,
    private changeDetector: ChangeDetectorRef,
  ) {
    super('TreeFileItemViewComponent');
  }

  get isLatestConstructionData(): boolean {
    return this.data3DViewHelperService.isLatestConstructionData(this.model);
  }

  onModelSelected(model: FileForView | undefined, event: MouseEvent) {
    if (this.isEditMode === true) {
      this.modelCheck.emit({
        isProgrammatic: true,
        shiftKeySelected: event.shiftKey,
      });
    } else {
      model && this.modelSelected.emit(model);
    }
  }

  handleChooseAction(action: TREE_ITEM_ACTION_KEYS, event: MouseEvent) {
    event.stopPropagation();
    if (this.checkIfDisabled(action)) return;

    this.menuExpanded = false;
    this.menuElement.nativeElement.style.display = 'none';

    switch (action) {
      case TREE_ITEM_ACTION_KEYS.PROPERTIES:
        this.showProperty.emit(this.model);
        break;
      case TREE_ITEM_ACTION_KEYS.EDIT:
        this.showEditForm.emit(this.model);
        break;
      case TREE_ITEM_ACTION_KEYS.MOVE_TO_TRASH:
        this.errorMessage = undefined;
        this.handleMoveToTrash();
        break;
      case TREE_ITEM_ACTION_KEYS.RESTORE_FROM_TRASH:
        this.handleRestoreFromTrash();
        break;
      case TREE_ITEM_ACTION_KEYS.OPEN_DELETE_MODEL:
        this.errorMessage = undefined;
        this.confirmDeleteFileOrFolder?.open();
        break;
      case TREE_ITEM_ACTION_KEYS.FIT_VIEW:
        this.data3DViewHelperService.setCameraToModel(
          this.model?.id ?? '',
          !!this.model?.visualizeUrl,
        );
        break;
      case TREE_ITEM_ACTION_KEYS.POINT_LIST:
        // ポイントリスト現示
        this.showPointListPanel();
        break;
      case TREE_ITEM_ACTION_KEYS.EXPORT:
        this.showExportPanel.emit(this.model);
        break;
      case TREE_ITEM_ACTION_KEYS.HEIGHT_CHANGE:
        this.showHeightChangePanel.emit(this.model);
        break;
      case TREE_ITEM_ACTION_KEYS.TOPOGRAPHY:
        if (
          this.projectAccessControlService.isProductConstructionHistoryAvailable()
        ) {
          this.showConstructionTopography.emit(this.model);
        }
        break;
      case TREE_ITEM_ACTION_KEYS.MOVE_TO_TRASH_MULTI:
        this.handleMoveToTrashMulti();
        break;
      case TREE_ITEM_ACTION_KEYS.OPEN_DELETE_MODEL_MULTI:
        this.openDeleteModalMulti.emit();
        break;
      case TREE_ITEM_ACTION_KEYS.RESTORE_FROM_TRASH_MULTI:
        this.handleRestoreFromTrashMulti();
        break;
      default:
        return;
    }
  }

  async handleOkDelete() {
    if (!this.model || this.unableToEdit()) return;

    this.errorMessage = undefined;
    this.checkLocks = true;
    const locked = await this.projectAccessControlService.isLocked(
      LockFuncName.Model,
      this.model?.id,
    );
    this.checkLocks = false;
    // ロックされている場合は変更不可
    if (locked) {
      this.errorMessage = extractAppMessage('SOK5002');
      this.changeDetector.detectChanges();
      return;
    }

    this.store.dispatch(
      ModelPropertyViewAction.SelectedFile3DModel({
        file: this.model,
      }),
    );

    this.store.dispatch(
      ModelPropertyViewAction.DeleteFileModelAction({
        model: this.model,
      }),
    );

    this.closePopupConfirmDelete();
  }

  // ゴミ箱へ移動する
  async handleMoveToTrash() {
    if (!this.model || this.unableToEdit()) return;
    this.moveToTrash.emit(this.model);
  }

  // ゴミ箱へ移動する（一括）
  async handleMoveToTrashMulti() {
    if (this.unableToEdit(true)) return;
    this.moveToTrashMulti.emit();
  }

  // ゴミ箱から戻す
  handleRestoreFromTrash() {
    if (this.unableToEdit()) return;
    this.restore.emit(this.model);
  }

  // ゴミ箱から戻す（一括）
  handleRestoreFromTrashMulti() {
    if (this.unableToEdit(true)) return;
    this.restoreFromTrashMulti.emit();
  }

  closePopupConfirmDelete() {
    this.confirmDeleteFileOrFolder?.close();
  }

  showPointListPanel() {
    this.store.dispatch(
      Data3dViewWideAction.SetShowPointListPanelAction({
        showPointListPanel: true,
      }),
    );
    this.store.dispatch(
      PointListPanelAction.SetDefaultFileAction({
        fileName: this.model?.name,
      }),
    );
    this.store.dispatch(PointListPanelAction.GetPointListAction());
  }

  /**
   * メニューの使用権限があるかどうか
   */
  public checkIfDisabled(action: TREE_ITEM_ACTION_KEYS): boolean {
    switch (action) {
      case TREE_ITEM_ACTION_KEYS.OPEN_DELETE_MODEL:
        return this.unableToEdit();
      case TREE_ITEM_ACTION_KEYS.MOVE_TO_TRASH:
        return this.unableToEdit();
      case TREE_ITEM_ACTION_KEYS.RESTORE_FROM_TRASH:
        return this.unableToEdit();
      case TREE_ITEM_ACTION_KEYS.EXPORT:
        return this.checkIfDisabledExport();
      case TREE_ITEM_ACTION_KEYS.HEIGHT_CHANGE:
        return this.unableToEdit();
      case TREE_ITEM_ACTION_KEYS.TOPOGRAPHY:
        return !this.projectAccessControlService.isConstructionHistoryReportAvailable();
      default:
        return false;
    }
  }

  public toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    if (this.isEditMode === true) {
      return;
    } else {
      this.treeItemActions = [...TREE_ITEM_ACTIONS];

      if (this.model?.modelType !== 6) {
        this.treeItemActions = this.treeItemActions.filter(
          (action) => action.key !== TREE_ITEM_ACTION_KEYS.HEIGHT_CHANGE,
        );
      }

      if (this.model?.modelType === Number(ModelCategoryType.ポイント)) {
        this.treeItemActions = [POINT_LIST_ACTION].concat(this.treeItemActions);
      } else if (
        this.isLatestConstructionData &&
        this.model?.modelType === Number(ModelCategoryType.点群データ)
      ) {
        if (
          this.projectAccessControlService.isProductConstructionHistoryAvailable()
        ) {
          this.treeItemActions = [TOPOGRAPHY_ACTION].concat(
            this.treeItemActions,
          );
        }
      }

      if (this.model?.modelStatus === ModelStatusTypes.NUMBER_1) {
        const index = this.treeItemActions.findIndex(
          (action) => action.key === TREE_ITEM_ACTION_KEYS.MOVE_TO_TRASH,
        );

        this.treeItemActions[index] = OPEN_DELETE_MODEL;
        this.treeItemActions = [RESTORE_FROM_TRASH, ...this.treeItemActions];
      }
    }

    this.menuExpanded = !this.menuExpanded;

    if (this.menuExpanded) {
      const SAFE_OFFSET = 80;
      const ACTION_ITEM_HEIGHT = 32;
      const MENU_HEIGHT = ACTION_ITEM_HEIGHT * this.treeItemActions.length;

      const actionPos =
        this.actionElement.nativeElement.getBoundingClientRect();
      const bodyPos = document.body.getBoundingClientRect();

      if (actionPos.top + MENU_HEIGHT + SAFE_OFFSET > bodyPos.bottom) {
        this.menuElement.nativeElement.style.top = '';
        this.menuElement.nativeElement.style.bottom = '28px';
      } else {
        this.menuElement.nativeElement.style.top = '28px';
        this.menuElement.nativeElement.style.bottom = '';
      }
      this.menuElement.nativeElement.style.display = 'block';
    } else {
      this.menuElement.nativeElement.style.display = 'none';
    }
  }

  // ゴミ箱用
  unableToEdit(isMulti: boolean = false) {
    if (!isMulti) {
      return (
        !this.projectAccessControlService.isTrimbleConnectAdmin() ||
        !this.projectAccessControlService.isBasicAvailable() ||
        this.data3DViewHelperService.isLatestConstructionData(this.model)
      );
    } else {
      return (
        !this.projectAccessControlService.isTrimbleConnectAdmin() ||
        !this.projectAccessControlService.isBasicAvailable()
      );
    }
  }

  handleClickBox(event: MouseEvent) {
    event.stopPropagation();

    this.modelCheck.emit({
      isProgrammatic: false,
      shiftKeySelected: event.shiftKey,
    });
  }

  /**
   * エクスポート可否チェック
   */
  public checkIfDisabledExport(): boolean {
    if (!this.projectAccessControlService.isBasicAvailable()) {
      return true;
    }
    if (this.model) {
      if (
        this.model.modelType === EnumModelCateModelType.Model3d &&
        this.model.name === BACKGROUND_MAP_MODEL_NAME
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * モデルのタグリストを取得
   */
  public getModelTags(): MultiSelectDataItem[] {
    if (!this.model?.id || !this.tagSources || !this.tagRelation) return [];

    const modelTagIds = this.tagRelation[this.model.id] || [];
    return modelTagIds
      .map((tagId: string) =>
        this.tagSources.find((tag: MultiSelectDataItem) => tag.id === tagId),
      )
      .filter(
        (tag: MultiSelectDataItem | undefined): tag is MultiSelectDataItem =>
          tag !== undefined,
      );
  }

  /**
   * 表示するタグを取得（最大2個、それ以上の場合は"..."を表示）
   */
  public getDisplayTags(): { tags: MultiSelectDataItem[]; hasMore: boolean } {
    const allTags = this.getModelTags();
    if (allTags.length < 2) {
      return { tags: allTags, hasMore: false };
    }
    return { tags: allTags.slice(0, 1), hasMore: true };
  }

  /**
   * すべてのタグ名を含むツールチップテキストを取得
   */
  public getAllTagsTooltipText(): string {
    const allTags = this.getModelTags();
    if (allTags.length === 0) return '';

    const tagNames = allTags
      .slice(1)
      .map((tag) => tag.label)
      .join(', ');
    return `${tagNames}`;
  }

  /**
   * タグクリック時のハンドラー
   * クリックしたタグのラベルを親コンポーネントに通知
   */
  public onTagClick(tagLabel: string, event: MouseEvent): void {
    event.stopPropagation();
    this.tagClicked.emit(tagLabel);
  }

  /**
   * タグチップを表示すべきかどうかを判定
   * タグ編集モード時は常に表示、通常の編集モード時は非表示
   */
  public shouldDisplayTagChips(): boolean {
    const shouldDisplay =
      this.shouldShowTagChips && (!this.isEditMode || this.isTagEditMode);

    return shouldDisplay;
  }
}
