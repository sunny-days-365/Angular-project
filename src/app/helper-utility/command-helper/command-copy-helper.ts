const _executeCopy = async (tagName: 'input' | 'textarea', value: string) => {
  const $element = document.createElement(tagName);

  $element.value = value;

  // Make the element invisible and append it to the document
  $element.style.position = 'fixed';
  $element.style.top = '0';
  $element.style.left = '0';
  $element.style.opacity = '0';
  document.body.appendChild($element);

  $element.select();
  $element.setSelectionRange(0, $element.value.length);

  await navigator.clipboard.writeText($element.value);

  // Clean up by removing the element
  document.body.removeChild($element);
};

const copySingleLine = async (text: string) => {
  await _executeCopy('input', text);
};

const copyMultiLine = async (text: string[]) => {
  await _executeCopy('textarea', text.join('\n'));
};

export const copyToClipBoard = async (text: string | string[]) => {
  if (!Array.isArray(text)) {
    await copySingleLine(text);

    return;
  }

  await copyMultiLine(text);
};
