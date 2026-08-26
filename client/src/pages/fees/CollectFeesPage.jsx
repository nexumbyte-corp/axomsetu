import React, { useState } from 'react';

import { StudentSummaryCard } from '../../components/fees/StudentSummaryCard.jsx';
import { OutstandingChargesTable } from '../../components/fees/OutstandingChargesTable.jsx';
import { PaymentSummaryCard } from '../../components/fees/PaymentSummaryCard.jsx';
import { PaymentForm } from '../../components/fees/PaymentForm.jsx';
import { PaymentConfirmModal } from '../../components/fees/PaymentConfirmModal.jsx';
import { ReceiptSuccessModal } from '../../components/fees/ReceiptSuccessModal.jsx';
import { useStudentOutstanding, useCollectPayment, useDeleteUnpaidFeeCharge } from '../../hooks/usePaymentEngine.js';
import { toast } from '../../components/ui/Toast.jsx';

import { StudentPickerTable } from '../../components/fees/StudentPickerTable.jsx';

export const CollectFeesPage = () => {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedChargeIds, setSelectedChargeIds] = useState([]);
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [confirmModalData, setConfirmModalData] = useState(null);
  const [successModalData, setSuccessModalData] = useState(null);

  // Fetch outstanding charges for selected student
  const {
    data: outstandingRes,
    isLoading: isLoadingOutstanding,
    refetch: refetchOutstanding,
  } = useStudentOutstanding(selectedStudent?.id);

  const collectPaymentMutation = useCollectPayment();
  const deleteChargeMutation = useDeleteUnpaidFeeCharge();

  const charges = outstandingRes?.data?.charges || outstandingRes?.charges || [];
  const outstandingSummary = outstandingRes?.data?.summary || outstandingRes?.summary || {};

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setSelectedChargeIds([]);
    setPaymentAmounts({});
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setSelectedChargeIds([]);
    setPaymentAmounts({});
  };

  const handleToggleCharge = (chargeId, remainingBal) => {
    setSelectedChargeIds((prev) => {
      if (prev.includes(chargeId)) {
        const next = prev.filter((id) => id !== chargeId);
        setPaymentAmounts((pMap) => {
          const copy = { ...pMap };
          delete copy[chargeId];
          return copy;
        });
        return next;
      } else {
        setPaymentAmounts((pMap) => ({
          ...pMap,
          [chargeId]: remainingBal,
        }));
        return [...prev, chargeId];
      }
    });
  };

  const handleToggleAll = () => {
    const payableCharges = charges.filter(
      (c) => c.status === 'UNPAID' || c.status === 'PARTIAL'
    );

    const isAllSelected =
      payableCharges.length > 0 &&
      payableCharges.every((c) => selectedChargeIds.includes(c.id));

    if (isAllSelected) {
      setSelectedChargeIds([]);
      setPaymentAmounts({});
    } else {
      const allIds = payableCharges.map((c) => c.id);
      const newAmounts = {};
      payableCharges.forEach((c) => {
        const totalAmt = Number(c.chargeAmount ?? c.amount ?? 0);
        const paidAmt = Number(c.paidAmount ?? 0);
        const remainingBal = c.balance !== undefined && c.balance !== null
          ? Number(c.balance)
          : Math.max(0, totalAmt - paidAmt);
        newAmounts[c.id] = remainingBal;
      });
      setSelectedChargeIds(allIds);
      setPaymentAmounts(newAmounts);
    }
  };

  const handleUpdatePaymentAmount = (chargeId, value) => {
    const valNum = parseFloat(value);
    setPaymentAmounts((prev) => ({
      ...prev,
      [chargeId]: isNaN(valNum) ? '' : valNum,
    }));
  };

  // Calculate total balance due for all selected charges
  const selectedTotalBalance = selectedChargeIds.reduce((sum, id) => {
    const ch = charges.find((c) => c.id === id);
    if (!ch) return sum;
    const totalAmt = Number(ch.chargeAmount ?? ch.amount ?? 0);
    const paidAmt = Number(ch.paidAmount ?? 0);
    const remainingBal = ch.balance !== undefined && ch.balance !== null
      ? Number(ch.balance)
      : Math.max(0, totalAmt - paidAmt);
    return sum + remainingBal;
  }, 0);

  // Calculate actual paying amount (being paid now) for all selected charges
  const totalSelectedAmount = selectedChargeIds.reduce((sum, id) => {
    const amt = parseFloat(paymentAmounts[id]);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  // Open confirmation modal with payment breakdown
  const handlePreSubmitPayment = (formValues) => {
    if (!selectedStudent) return;
    if (selectedChargeIds.length === 0) {
      toast.error('Please select at least one charge to collect.');
      return;
    }

    const payloadCharges = selectedChargeIds.map((id) => ({
      chargeId: id,
      amount: parseFloat(paymentAmounts[id]),
    }));

    const selectedChargesList = selectedChargeIds.map((id) => {
      const ch = charges.find((c) => c.id === id);
      return {
        ...ch,
        payingAmount: parseFloat(paymentAmounts[id]),
      };
    });

    const payload = {
      studentId: selectedStudent.id,
      paymentDate: formValues.paymentDate,
      paymentMode: formValues.paymentMode,
      referenceNumber: formValues.referenceNumber,
      remarks: formValues.remarks,
      receivedAmount: totalSelectedAmount,
      charges: payloadCharges,
    };

    setConfirmModalData({
      formValues: {
        ...formValues,
        totalSelectedAmount,
      },
      selectedCharges: selectedChargesList,
      payload,
    });
  };

  // Execute collection mutation after user clicks "Confirm & Collect Fee"
  const handleConfirmCollectPayment = async () => {
    if (!confirmModalData?.payload) return;
    try {
      const res = await collectPaymentMutation.mutateAsync(confirmModalData.payload);
      toast.success('Payment collected successfully.');
      setConfirmModalData(null);
      setSuccessModalData(res.data || res);
      refetchOutstanding();
    } catch (err) {
      toast.error(err.message || 'Unable to collect payment.');
    }
  };

  const handleDeleteCharge = async (charge) => {
    try {
      await deleteChargeMutation.mutateAsync({ chargeId: charge.id, studentId: selectedStudent?.id });
      toast.success(`Unpaid fee charge '${charge.title}' deleted successfully.`);
      setSelectedChargeIds((prev) => prev.filter((id) => id !== charge.id));
      setPaymentAmounts((prev) => {
        const copy = { ...prev };
        delete copy[charge.id];
        return copy;
      });
      refetchOutstanding();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete unpaid fee charge.');
    }
  };

  const handleCollectAnother = () => {
    setSuccessModalData(null);
    setSelectedChargeIds([]);
    setPaymentAmounts({});
    refetchOutstanding();
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2">
      {/* Main Cashier Workspace */}
      {!selectedStudent ? (
        <StudentPickerTable onSelectStudent={handleSelectStudent} />
      ) : (
        <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2">
          {/* Student Profile Summary Header */}
          <div className="shrink-0">
            <StudentSummaryCard
              student={selectedStudent}
              outstandingSummary={outstandingSummary}
              onClearStudent={handleClearStudent}
            />
          </div>

          {/* Charges & Payment Form Grid */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-2.5 min-h-0 overflow-hidden">
            {/* Left 2 Columns: Outstanding Charges Business Table */}
            <div className="lg:col-span-2 flex flex-col h-full min-h-0 overflow-hidden">
              <OutstandingChargesTable
                charges={charges}
                selectedChargeIds={selectedChargeIds}
                paymentAmounts={paymentAmounts}
                onToggleCharge={handleToggleCharge}
                onToggleAll={handleToggleAll}
                onUpdatePaymentAmount={handleUpdatePaymentAmount}
                onDeleteCharge={handleDeleteCharge}
                isDeleting={deleteChargeMutation.isPending}
                isLoading={isLoadingOutstanding}
              />
            </div>

            {/* Right 1 Column: Summary & Payment Form Panel */}
            <div className="lg:col-span-1 flex flex-col gap-2 overflow-y-auto max-h-full pr-0.5">
              <PaymentSummaryCard
                selectedCount={selectedChargeIds.length}
                selectedTotalBalance={selectedTotalBalance}
                totalPayingAmount={totalSelectedAmount}
              />

              <PaymentForm
                onSubmit={handlePreSubmitPayment}
                isSubmitting={collectPaymentMutation.isPending}
                isDisabled={selectedChargeIds.length === 0}
                totalSelectedAmount={totalSelectedAmount}
              />
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      <PaymentConfirmModal
        isOpen={Boolean(confirmModalData)}
        onClose={() => setConfirmModalData(null)}
        onConfirm={handleConfirmCollectPayment}
        isSubmitting={collectPaymentMutation.isPending}
        student={selectedStudent}
        paymentDetails={confirmModalData?.formValues}
        selectedCharges={confirmModalData?.selectedCharges || []}
      />

      {/* Payment Success Confirmation Modal */}
      <ReceiptSuccessModal
        isOpen={Boolean(successModalData)}
        onClose={() => setSuccessModalData(null)}
        resultData={successModalData}
        onCollectAnother={handleCollectAnother}
      />
    </div>
  );
};

export default CollectFeesPage;

