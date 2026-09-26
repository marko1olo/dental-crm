/**
 * DENTE Dental CRM — 54-FZ Cash Desk & Split Payment Interactive Calculator
 * Multi-tender Split (Cash + Card + SBP QR + Deposit) • Mandate 8e Guarantee Act
 * Real-Time 54-FZ Fiscal Receipt Simulator
 */

(function () {
  'use strict';

  var INVOICE_AMOUNT = 18500;
  var tenders = {
    cash: 5000,
    card: 10000,
    sbp: 3500,
    deposit: 0
  };

  function formatMoney(num) {
    return num.toLocaleString('ru-RU') + ' ₽';
  }

  function recalculateCashier() {
    var cashVal = parseFloat(document.getElementById('inputCash')?.value || 0) || 0;
    var cardVal = parseFloat(document.getElementById('inputCard')?.value || 0) || 0;
    var sbpVal = parseFloat(document.getElementById('inputSbp')?.value || 0) || 0;
    var depositVal = parseFloat(document.getElementById('inputDeposit')?.value || 0) || 0;

    var totalPaid = cashVal + cardVal + sbpVal + depositVal;
    var diff = INVOICE_AMOUNT - totalPaid;

    var totalPaidEl = document.getElementById('cashierTotalPaid');
    if (totalPaidEl) totalPaidEl.textContent = formatMoney(totalPaid);

    var balanceEl = document.getElementById('cashierBalanceStatus');
    var guaranteeBanner = document.getElementById('guaranteeActBanner');

    if (totalPaid === 0 && INVOICE_AMOUNT === 0) {
      if (balanceEl) {
        balanceEl.textContent = '100% Гарантийное обслуживание (0.00 ₽)';
        balanceEl.className = 'status-badge badge-win';
      }
      if (guaranteeBanner) guaranteeBanner.classList.add('active');
    } else if (diff === 0) {
      if (balanceEl) {
        balanceEl.textContent = 'Оплачено полностью (Баланс 0.00 ₽)';
        balanceEl.className = 'status-badge badge-win';
      }
      if (guaranteeBanner) guaranteeBanner.classList.remove('active');
    } else if (diff > 0) {
      if (balanceEl) {
        balanceEl.textContent = 'К доплате: ' + formatMoney(diff);
        balanceEl.className = 'status-badge badge-fail';
      }
      if (guaranteeBanner) guaranteeBanner.classList.remove('active');
    } else {
      if (balanceEl) {
        balanceEl.textContent = 'Сдача пациенту: ' + formatMoney(Math.abs(diff));
        balanceEl.className = 'status-badge badge-win';
      }
      if (guaranteeBanner) guaranteeBanner.classList.remove('active');
    }

    // Update Live Fiscal Receipt Ticket Preview
    updateReceiptTicket(cashVal, cardVal, sbpVal, depositVal, totalPaid);
  }

  function updateReceiptTicket(cash, card, sbp, deposit, total) {
    var rTotal = document.getElementById('receiptTotal');
    if (rTotal) rTotal.textContent = formatMoney(INVOICE_AMOUNT);

    var rCash = document.getElementById('receiptCash');
    if (rCash) rCash.textContent = formatMoney(cash);

    var rCard = document.getElementById('receiptCard');
    if (rCard) rCard.textContent = formatMoney(card);

    var rSbp = document.getElementById('receiptSbp');
    if (rSbp) rSbp.textContent = formatMoney(sbp);

    var rDeposit = document.getElementById('receiptDeposit');
    if (rDeposit) rDeposit.textContent = formatMoney(deposit);

    var rDate = document.getElementById('receiptDate');
    if (rDate) {
      var now = new Date();
      rDate.textContent = now.toLocaleDateString('ru-RU') + ' ' + now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
  }

  function setTenders(cash, card, sbp, deposit, invoice) {
    if (typeof invoice === 'number') {
      INVOICE_AMOUNT = invoice;
      var invEl = document.getElementById('cashierInvoiceDue');
      if (invEl) invEl.textContent = formatMoney(INVOICE_AMOUNT);
    }
    var cIn = document.getElementById('inputCash');
    var dIn = document.getElementById('inputCard');
    var sIn = document.getElementById('inputSbp');
    var pIn = document.getElementById('inputDeposit');

    if (cIn) cIn.value = cash;
    if (dIn) dIn.value = card;
    if (sIn) sIn.value = sbp;
    if (pIn) pIn.value = deposit;

    recalculateCashier();
  }

  function initCashierCalc() {
    ['inputCash', 'inputCard', 'inputSbp', 'inputDeposit'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', recalculateCashier);
      }
    });

    var btnFullCard = document.getElementById('btnSplit100Card');
    if (btnFullCard) {
      btnFullCard.addEventListener('click', function () {
        setTenders(0, 18500, 0, 0, 18500);
      });
    }

    var btnFullSbp = document.getElementById('btnSplit100Sbp');
    if (btnFullSbp) {
      btnFullSbp.addEventListener('click', function () {
        setTenders(0, 0, 18500, 0, 18500);
      });
    }

    var btnHalfSplit = document.getElementById('btnSplitHalf');
    if (btnHalfSplit) {
      btnHalfSplit.addEventListener('click', function () {
        setTenders(5000, 10000, 3500, 0, 18500);
      });
    }

    var btnZeroGuarantee = document.getElementById('btnSplitGuarantee');
    if (btnZeroGuarantee) {
      btnZeroGuarantee.addEventListener('click', function () {
        setTenders(0, 0, 0, 0, 0);
      });
    }

    // Set initial values
    setTenders(tenders.cash, tenders.card, tenders.sbp, tenders.deposit, INVOICE_AMOUNT);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCashierCalc);
  } else {
    initCashierCalc();
  }
})();
