/**
 * Convert a number to Indian currency words format.
 */
function numberToWords(num) {
  if (num === null || num === undefined) return null;
  
  let n = parseFloat(num);
  if (isNaN(n) || n < 0) return null;

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertGroup(n) {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n = n % 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ';
      n = n % 10;
    }
    if (n > 0) {
      str += a[n];
    }
    return str;
  }

  // Handle integers and decimals
  let parts = String(n).split('.');
  let rupees = parseInt(parts[0], 10);
  let paise = parts.length > 1 ? parseInt(parts[1].padEnd(2, '0').slice(0, 2), 10) : 0;

  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';

  let result = '';

  if (rupees > 0) {
    if (rupees > 9999999) {
      result += convertGroup(Math.floor(rupees / 10000000)) + 'Crore ';
      rupees %= 10000000;
    }
    if (rupees > 99999) {
      result += convertGroup(Math.floor(rupees / 100000)) + 'Lakh ';
      rupees %= 100000;
    }
    if (rupees > 999) {
      result += convertGroup(Math.floor(rupees / 1000)) + 'Thousand ';
      rupees %= 1000;
    }
    if (rupees > 0) {
      result += convertGroup(rupees);
    }
    result = result.trim() + ' Rupees';
  }

  if (paise > 0) {
    if (result) result += ' and ';
    result += convertGroup(paise).trim() + ' Paise';
  }

  return result.trim() + ' Only';
}

module.exports = { numberToWords };
