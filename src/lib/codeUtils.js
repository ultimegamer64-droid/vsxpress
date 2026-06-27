export function makeTransferCode(transferNumber) {
  if (transferNumber === undefined || transferNumber === null) return 'VSX-????';
  return `VSX-${transferNumber.toString().padStart(5, '0')}`;
}

export function makeTransferCodeFromId(uuid) {
  if (!uuid || typeof uuid !== 'string') return 'VSX-????';

  // partie la plus variable du UUID (derniers 4 hex)
  const suffix = uuid.replace(/-/g, '').slice(-4);
  const decimalValue = parseInt(suffix, 16);

  if (isNaN(decimalValue)) return 'VSX-ERR';

  return `VSX-${(decimalValue % 10000).toString().padStart(4, '0')}`;
}

export function getTransferCode(transfer) {
  if (transfer?.transfer_number) return makeTransferCode(transfer.transfer_number);
  if (transfer?.id) return makeTransferCodeFromId(transfer.id);
  return 'VSX-????';
}
