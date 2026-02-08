import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { omitBy, isNil, get } from 'lodash';
import { formatDate } from '../date-helper/date-helper';

export function nameValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: unknown } | null => {
    const forbiddenChars = /[<>/\\|?:*"]|\.{2}|\.$/; // Ignore character: < > / \ | ? : * ..(double dot) *.(Characters followed by dot)"

    if (control.value && forbiddenChars.test(control.value)) {
      return { forbiddenChars: true };
    }

    return null;
  };
}

export function notEmpty(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: boolean } | null => {
    if (isNil(control?.value) || isAllSpaceCharacter(control?.value)) {
      return { emptyString: true };
    }
    return null;
  };
}

export function isAllSpaceCharacter(value: string): boolean {
  const pattern = new RegExp(/^\s+$/, 'm');
  return pattern.test(value);
}

export function removeEmptyFields<T extends Record<string, unknown>>(
  inputObject: T,
): Partial<T> {
  return omitBy<T>(inputObject, isNil);
}

export function isError(
  errorType: string,
  control: AbstractControl | null,
): boolean {
  return control?.errors?.[errorType] && control.touched;
}

/**
  Check validator min max value unit input
  ValidatorFn will return data type null
  so this function is use null type , breaking the coding rules exceptionally.
*/
export function ValidatorMax(minUnit: number, maxUnit: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const { value } = control;
    const regex = /^[-+]?(\d+(\.\d*)?|\.\d+|[-+]?\.)?([eE][-+]?\d+)?$/;
    const valueNew = (value || '')?.toString()?.match(regex);

    const maxValue =
      Number(valueNew[0]) >= minUnit && Number(valueNew[0]) <= maxUnit;

    if (!maxValue) {
      control.setErrors({ max: true });
      return { max: true };
    } else {
      control.setErrors({ max: null });
      return null;
    }
  };
}

/**
  Check validate required modus select. If user select empty data, modus return value { id: '', display: '' }
  ValidatorFn will return data type null
  so this function is use null type , breaking the coding rules exceptionally.
*/
export function ValidatorModusSelectRequired(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const { value } = control;

    if ((!value || !value?.id) && control.touched) {
      control.setErrors({ modusSelectRequired: true });

      return { modusSelectRequired: true };
    } else {
      return null;
    }
  };
}

/**
Check validate required ntc-basic-multi-select. If user select empty data, modus return value { id: '', display: '' }
ValidatorFn will return data type null
so this function is use null type , breaking the coding rules exceptionally.
*/
export function ValidatorMultiSelectRequired(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const { value } = control;

    if (!value.length && control.touched) {
      control.setErrors({ requiredMultiSelect: true });
      return { requiredMultiSelect: true };
    } else {
      return null;
    }
  };
}

/**
Check values form changed
*/

export function checkFormChanged(
  valueForm: Record<string, unknown>,
  dataInit: Record<string, unknown>,
  keys: string[],
): boolean {
  let isValueChange: boolean = false;

  keys.forEach((key) => {
    if (isValueChange) return;
    if (get(dataInit, key) !== get(valueForm, key)) {
      isValueChange = true;
    }
  });

  return isValueChange;
}

export function isDateChanged(currentDateStr: string, initDateStr: string) {
  const format = 'yyyy-MM-dd';
  return formatDate(currentDateStr, format) !== formatDate(initDateStr, format);
}

/**
Check values form changed Date
*/
export function checkFormChangedDate(
  valueForm: Record<string, unknown>,
  dataInit: Record<string, unknown>,
  keys: string[],
) {
  let isValueChange: boolean = false;

  keys.forEach((key) => {
    if (isValueChange) return;

    const currentDateValue = get(valueForm, key);
    const initDateValue = get(dataInit, key);

    if (
      currentDateValue &&
      initDateValue &&
      isDateChanged(currentDateValue as string, initDateValue as string)
    ) {
      isValueChange = true;
    }
  });

  return isValueChange;
}
