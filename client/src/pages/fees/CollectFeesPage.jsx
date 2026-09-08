import React, { useState } from 'react';

import { StudentSummaryCard } from '../../components/fees/StudentSummaryCard.jsx';
import { OutstandingChargesTable } from '../../components/fees/OutstandingChargesTable.jsx';
import { PaymentSummaryCard } from '../../components/fees/PaymentSummaryCard.jsx';
import { PaymentForm } from '../../components/fees/PaymentForm.jsx';
import { PaymentConfirmModal } from '../../components/fees/PaymentConfirmModal.jsx';
import { ReceiptSuccessModal } from '../../components/fees/ReceiptSuccessModal.jsx';
import { useStudentOutstanding, useCollectPayment, useDeleteUnpaidFeeCharge } from '../../hooks/usePaymentEngine.js';
import { toast } from '../../components/ui/Toast.jsx';
import { useAuth } from '../../hooks/useAuth.js';

import { StudentPickerTable } from '../../components/fees/StudentPickerTable.jsx';

export const CollectFeesPage = () => {
  const { schoolMembership, user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedChargeIds, setSelectedChargeIds] = useState([]);
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [confirmModalData, setConfirmModalData] = useState(null);
  const [successModalData, setSuccessModalData] = useState(null);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);

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

  const handleShareWhatsApp = async () => {
    if (!selectedStudent) return;
    setIsSharingWhatsApp(true);

    try {
      const rawPhone =
        selectedStudent.phone ||
        selectedStudent.guardianPhone ||
        selectedStudent.guardianMobile ||
        selectedStudent.fatherPhone ||
        selectedStudent.mobile ||
        '';
      const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
      const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

      const schoolInfo = schoolMembership?.school || user?.school || user?.schoolAdmin?.school || {};
      const schoolName = (schoolInfo?.name || schoolInfo?.schoolName || 'SCHOOL ACADEMY').trim();
      const schoolAddress = (schoolInfo?.address || schoolInfo?.location || '').trim();
      const schoolPhone = (schoolInfo?.phone || schoolInfo?.contactNo || '').trim();

      let headerBlock = `*🏫 ${schoolName.toUpperCase()}*`;
      if (schoolAddress) headerBlock += `\n${schoolAddress}`;
      if (schoolPhone) headerBlock += `\nContact: ${schoolPhone}`;

      const pendingList = charges.filter((c) => c.status === 'UNPAID' || c.status === 'PARTIAL');
      const activeEnrollment =
        selectedStudent.enrollments?.find((e) => e.status === 'ACTIVE') ||
        selectedStudent.enrollments?.[0] ||
        selectedStudent.enrollment;

      const rawClassName = activeEnrollment?.class?.name || selectedStudent?.class?.name || '';
      const cleanClassName = rawClassName.replace(/^Class\s+/i, '').trim();
      const classNameDisplay = cleanClassName ? cleanClassName : (rawClassName || 'N/A');
      const sectionName = activeEnrollment?.section?.name || selectedStudent?.section?.name || '';
      const sectionDisplay = sectionName ? ` (${sectionName})` : '';
      const guardianName = selectedStudent.guardianName || selectedStudent.fatherName || 'N/A';

      const targetList = pendingList.length > 0 ? pendingList : charges;

      const totalDues = targetList.reduce(
        (sum, c) =>
          sum +
          (c.balance !== undefined && c.balance !== null
            ? Number(c.balance)
            : Math.max(0, Number(c.chargeAmount ?? c.amount ?? 0) - Number(c.paidAmount ?? 0))),
        0
      );

      const itemsBreakdown = targetList
        .map((f, i) => {
          const bal =
            f.balance !== undefined && f.balance !== null
              ? Number(f.balance)
              : Math.max(0, Number(f.chargeAmount ?? f.amount ?? 0) - Number(f.paidAmount ?? 0));
          const monthText = f.month ? ` (${f.month}${f.year ? ' ' + f.year : ''})` : '';
          return `${i + 1}. ${f.title}${monthText}: ₹${bal.toFixed(2)}`;
        })
        .join('\n');

      const messageText = `${headerBlock}\n\n*OUTSTANDING FEE STATEMENT*\n----------------------------------------\n*Student:* ${selectedStudent.name}\n*Admission No:* ${selectedStudent.admissionNo || 'N/A'}\n*Class:* ${classNameDisplay}${sectionDisplay}\n*Guardian:* ${guardianName}\n\n*PENDING DUES BREAKDOWN:*\n${itemsBreakdown || 'No active pending dues.'}\n\n----------------------------------------\n*Total Outstanding Dues:* ₹${totalDues.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n----------------------------------------\n\nPlease clear the pending dues at the school office or via online payment. Thank you!`;

      const encodedMsg = encodeURIComponent(messageText);
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isMobile && navigator.share) {
        try {
          await navigator.share({
            title: `Outstanding Fee Statement - ${selectedStudent.name}`,
            text: messageText,
          });
        } catch (err) {
          if (err.name !== 'AbortError') {
            const whatsappUrl = formattedPhone
              ? `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMsg}`
              : `https://api.whatsapp.com/send?text=${encodedMsg}`;
            window.open(whatsappUrl, '_blank');
          }
        }
        toast.success('WhatsApp sharing opened.');
        return;
      }

      const whatsappUrl = formattedPhone
        ? `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMsg}`
        : `https://api.whatsapp.com/send?text=${encodedMsg}`;

      window.open(whatsappUrl, '_blank');
      toast.success('WhatsApp opened with Fee Statement.');
    } catch (err) {
      console.error('WhatsApp share error:', err);
      toast.error('Could not open WhatsApp share.');
    } finally {
      setIsSharingWhatsApp(false);
    }
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
                onShareWhatsApp={handleShareWhatsApp}
                isSharingWhatsApp={isSharingWhatsApp}
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

