import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import {
  isValidFileExtensionAllowed,
  isValidFileSize,
} from 'src/app/helper-utility/file-helper/file-helper';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { ACCEPT_FILE_UPLOAD_EXTENSION } from '../../../../import-popup.definition';
import { getDataTransferStructure } from '@nikon-trimble-sok/parts-components';
import { DataTransferStructure } from '@nikon-trimble-sok/parts-components';
import { BasicListFileComponent } from 'src/app/parts-components/basic-list-file/basic-list-file.component';

@Component({
  selector: 'ntc-import-popup-upload-local-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss'],
})
export class ImportPopupUploadLocalUploadComponent extends BaseComponent {
  @ViewChild('listFile') listFileComponent: BasicListFileComponent | undefined;

  @Input()
  public fileAcceptExtensionList: string[] = ACCEPT_FILE_UPLOAD_EXTENSION;

  @Input()
  public multiple: boolean = false;

  public errorList: string[] = [];

  @Input()
  public loading: boolean | undefined;

  @Output()
  public removeFile: EventEmitter<File[]> = new EventEmitter<File[]>();

  @Output()
  public fileChange: EventEmitter<File[]> = new EventEmitter<File[]>();

  public hasDragOver = false;

  public files: File[] = [];

  public heightUploadZone: string = '253px';

  public isDrop: boolean = false;

  constructor() {
    super('ImportPopupUploadLocalUploadComponent');
  }

  @HostListener('dragover', ['$event']) onDragover(event: DragEvent) {
    this.hasDragOver = true;
    event.preventDefault();
  }

  @HostListener('drop', ['$event']) async onDrop(event: DragEvent) {
    this.hasDragOver = false;
    this.handleDrop(event);
  }

  @HostListener('dragleave', ['$event']) async onDragLeave() {
    this.hasDragOver = false;
  }

  public onSelect() {
    this.validateFile(this.files);

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = this.fileAcceptExtensionList.join(',');

    input.addEventListener('change', () => {
      const files = input.files;

      if (files && !this.isDrop) {
        this.files = Object.entries(files).map(([, value]) => value) as File[];
        this.validateFile(this.files);
        this.fileChange.emit(this.files);
      }
    });
    input.click();
  }

  public async handleDrop(event: DragEvent) {
    // reflesh array
    const fileUpdate = [...this.files];
    this.files = fileUpdate;
    event.preventDefault();
    if (event.dataTransfer) {
      this.isDrop = true;

      const dataTransfer = event.dataTransfer;
      if (!dataTransfer) return;

      const dataStructure = await getDataTransferStructure(dataTransfer);

      if (dataStructure) {
        const dataList = Object.entries(dataStructure).map(([name, file]) => {
          const isFile = file instanceof File;
          const isFolder = !isFile;

          return {
            name,
            isFile,
            isFolder,
            file,
          };
        });

        dataList.forEach((item) => {
          if (item.isFile) {
            this.files.push(item.file as File);
          } else {
            Object.entries(item.file).map(([, file]) => {
              this.files.push(file as File);
            });
          }
        });

        if (this.listFileComponent) {
          this.listFileComponent.changeFile(this.files);
        }

        this.validateFile(this.files);
        this.fileChange.emit(this.files);
        this.isDrop = false;
      }
    }
  }

  public onRemove(ev: File) {
    const fileUpdate = [...this.files].filter((item) => item !== ev);

    this.files = fileUpdate;
    this.removeFile.emit(this.files);
    this.validateFile(this.files);

    if (this.files.length > 5) {
      this.heightUploadZone = '190px';
    } else if (this.files.length > 4) {
      this.heightUploadZone = '250px';
    } else {
      this.heightUploadZone = '300px';
    }
  }

  public resetFile() {
    this.files = [];
    this.errorList = [];
  }

  public validateFile(files: File[]) {
    this.errorList = [];
    if (!isValidFileSize(files)) {
      this.errorList.push(this.extractAppMessage('SOK1004', ['5GB']));
    } else if (
      !isValidFileExtensionAllowed(files, this.fileAcceptExtensionList)
    ) {
      this.errorList.push(this.extractAppMessage('SOK1025'));
    }
  }

  private convertDataDropDataList = (data: DataTransferStructure) => {
    return Object.entries(data).map(([name, file]) => {
      const isFile = file instanceof File;
      const isFolder = !isFile;

      return {
        name,
        isFile,
        isFolder,
        file,
      };
    });
  };
}
