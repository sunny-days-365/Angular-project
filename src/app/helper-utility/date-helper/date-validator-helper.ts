import { AbstractControl, ValidatorFn } from '@angular/forms';

export function dateRangeValidator(
  startDateKey?: string,
  endDateKey?: string,
): ValidatorFn {
  const DEFAULT_START_KEY = 'startDate';
  const DEFAULT_END_KEY = 'endDate';

  return (control: AbstractControl): { [key: string]: boolean } | null => {
    const dateStart = control.get(startDateKey ?? DEFAULT_START_KEY)?.value;
    const dateEnd = control.get(endDateKey ?? DEFAULT_END_KEY)?.value;

    if (dateStart && dateEnd && new Date(dateStart) > new Date(dateEnd)) {
      return { dateRangeError: true };
    }

    return null;
  };
}
