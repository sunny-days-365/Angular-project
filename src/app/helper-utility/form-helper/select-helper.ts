export const truncateDisplayOption = (
  value: string | undefined,
  maxLength = 32,
): string => {
  if (!value) return '';

  return value && value?.length <= maxLength
    ? value
    : value?.slice(0, maxLength - 2) + '...';
};
