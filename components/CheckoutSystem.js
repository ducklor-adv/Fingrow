import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

const { width } = Dimensions.get('window');

// Mock address data
const mockAddresses = [
  {
    id: 'addr1',
    name: 'จเด่น สมิธ',
    phone: '081-234-5678',
    address: '123/45 หมู่ 2',
    subDistrict: 'บางนา',
    district: 'บางนา',
    province: 'กรุงเทพมหานคร',
    postalCode: '10260',
    isDefault: true,
  },
  {
    id: 'addr2',
    name: 'จเด่น สมิธ (ที่ทำงาน)',
    phone: '081-234-5678',
    address: '999 อาคารชินวัตรทาวเวอร์ ชั้น 25',
    subDistrict: 'ลุมพินี',
    district: 'ปทุมวัน',
    province: 'กรุงเทพมหานคร',
    postalCode: '10330',
    isDefault: false,
  },
];

// Shipping methods
const shippingMethods = [
  {
    id: 'standard',
    name: 'ขนส่งปกติ',
    description: '3-5 วันทำการ',
    price: 50,
    icon: 'car',
  },
  {
    id: 'express',
    name: 'ขนส่งด่วน',
    description: '1-2 วันทำการ',
    price: 100,
    icon: 'flash',
  },
  {
    id: 'pickup',
    name: 'รับเอง',
    description: 'นัดรับที่ร้าน',
    price: 0,
    icon: 'storefront',
  },
];

// Payment methods
const paymentMethods = [
  {
    id: 'wld',
    name: 'Worldcoin (WLD)',
    description: 'จ่ายด้วยกระเป๋า WLD',
    icon: 'logo-bitcoin',
    available: true,
  },
  {
    id: 'credit',
    name: 'บัตรเครดิต/เดบิต',
    description: 'Visa, Mastercard',
    icon: 'card',
    available: false,
    comingSoon: true,
  },
  {
    id: 'banking',
    name: 'โอนธนาคาร',
    description: 'ผ่านแอปธนาคาร',
    icon: 'business',
    available: false,
    comingSoon: true,
  },
];

// Address Selection Modal
const AddressModal = ({ visible, addresses, selectedId, onSelect, onClose, onAddNew }) => {
  const renderAddress = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.addressItem,
        selectedId === item.id && styles.addressItemSelected
      ]}
      onPress={() => onSelect(item)}
    >
      <View style={styles.addressItemContent}>
        <View style={styles.addressHeader}>
          <Text style={styles.addressName}>{item.name}</Text>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>ค่าเริ่มต้น</Text>
            </View>
          )}
        </View>
        <Text style={styles.addressPhone}>{item.phone}</Text>
        <Text style={styles.addressText}>
          {item.address} {item.subDistrict} {item.district} {item.province} {item.postalCode}
        </Text>
      </View>
      {selectedId === item.id && (
        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#f4f4f5" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>เลือกที่อยู่จัดส่ง</Text>
          <TouchableOpacity onPress={onAddNew}>
            <Text style={styles.addNewText}>+ เพิ่มใหม่</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {addresses.map((address) => (
            <View key={address.id}>
              {renderAddress({ item: address })}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

// Add New Address Modal
const AddAddressModal = ({ visible, onSave, onClose }) => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    subDistrict: '',
    district: '',
    province: '',
    postalCode: '',
    isDefault: false,
  });

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Basic validation
    const required = ['name', 'phone', 'address', 'subDistrict', 'district', 'province', 'postalCode'];
    const missing = required.filter(field => !form[field].trim());

    if (missing.length > 0) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    const newAddress = {
      id: `addr${Date.now()}`,
      ...form,
    };

    onSave(newAddress);
    setForm({
      name: '',
      phone: '',
      address: '',
      subDistrict: '',
      district: '',
      province: '',
      postalCode: '',
      isDefault: false,
    });
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>ยกเลิก</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>เพิ่มที่อยู่ใหม่</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveText}>บันทึก</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>ชื่อผู้รับ *</Text>
            <TextInput
              style={styles.formInput}
              value={form.name}
              onChangeText={(text) => updateForm('name', text)}
              placeholder="เช่น นายสมชาย ใจดี"
              placeholderTextColor="#71717a"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>เบอร์โทรศัพท์ *</Text>
            <TextInput
              style={styles.formInput}
              value={form.phone}
              onChangeText={(text) => updateForm('phone', text)}
              placeholder="เช่น 081-234-5678"
              placeholderTextColor="#71717a"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>ที่อยู่ *</Text>
            <TextInput
              style={[styles.formInput, styles.addressInput]}
              value={form.address}
              onChangeText={(text) => updateForm('address', text)}
              placeholder="บ้านเลขที่ ซอย ถนน"
              placeholderTextColor="#71717a"
              multiline
            />
          </View>

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>ตำบล/แขวง *</Text>
              <TextInput
                style={styles.formInput}
                value={form.subDistrict}
                onChangeText={(text) => updateForm('subDistrict', text)}
                placeholder="ตำบล/แขวง"
                placeholderTextColor="#71717a"
              />
            </View>

            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>อำเภอ/เขต *</Text>
              <TextInput
                style={styles.formInput}
                value={form.district}
                onChangeText={(text) => updateForm('district', text)}
                placeholder="อำเภอ/เขต"
                placeholderTextColor="#71717a"
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>จังหวัด *</Text>
              <TextInput
                style={styles.formInput}
                value={form.province}
                onChangeText={(text) => updateForm('province', text)}
                placeholder="จังหวัด"
                placeholderTextColor="#71717a"
              />
            </View>

            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>รหัสไปรษณีย์ *</Text>
              <TextInput
                style={styles.formInput}
                value={form.postalCode}
                onChangeText={(text) => updateForm('postalCode', text)}
                placeholder="12345"
                placeholderTextColor="#71717a"
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
          </View>

          <View style={styles.defaultSwitchContainer}>
            <Text style={styles.defaultSwitchLabel}>ตั้งเป็นที่อยู่เริ่มต้น</Text>
            <Switch
              value={form.isDefault}
              onValueChange={(value) => updateForm('isDefault', value)}
              trackColor={{ false: '#3f3f46', true: 'rgba(16, 185, 129, 0.3)' }}
              thumbColor={form.isDefault ? '#10b981' : '#a1a1aa'}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// Main Checkout Component
const CheckoutSystem = ({ visible, item, currency, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [addresses, setAddresses] = useState(mockAddresses);
  const [selectedAddress, setSelectedAddress] = useState(mockAddresses.find(a => a.isDefault));
  const [selectedShipping, setSelectedShipping] = useState(shippingMethods[0]);
  const [selectedPayment, setSelectedPayment] = useState(paymentMethods[0]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const steps = ['ที่อยู่', 'จัดส่ง', 'ชำระเงิน', 'ยืนยัน'];

  const formatNumber = (number, locale) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(number);

  const toWLD = (localPrice, rate) => (rate ? localPrice / rate : 0);

  if (!item) return null;

  const itemWLD = toWLD(item.priceLocal, currency.rate);
  const shippingWLD = toWLD(selectedShipping.price, currency.rate);
  const totalWLD = itemWLD + shippingWLD;
  const communityFee = itemWLD * (item.pct / 100);

  const handleAddAddress = (newAddress) => {
    const updatedAddresses = [...addresses, newAddress];
    setAddresses(updatedAddresses);
    setSelectedAddress(newAddress);
    setShowAddAddressModal(false);
  };

  const handleProcessPayment = async () => {
    setProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      onComplete({
        item,
        address: selectedAddress,
        shipping: selectedShipping,
        payment: selectedPayment,
        total: totalWLD,
        notes,
        orderId: `ORD${Date.now()}`,
      });
    }, 3000);
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {steps.map((step, index) => (
        <View key={index} style={styles.stepItem}>
          <View style={[
            styles.stepCircle,
            index <= currentStep ? styles.stepCircleActive : styles.stepCircleInactive
          ]}>
            <Text style={[
              styles.stepNumber,
              index <= currentStep ? styles.stepNumberActive : styles.stepNumberInactive
            ]}>
              {index + 1}
            </Text>
          </View>
          <Text style={[
            styles.stepLabel,
            index <= currentStep ? styles.stepLabelActive : styles.stepLabelInactive
          ]}>
            {step}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderAddressStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>ที่อยู่จัดส่ง</Text>

      <TouchableOpacity
        style={styles.addressSelector}
        onPress={() => setShowAddressModal(true)}
      >
        {selectedAddress ? (
          <View style={styles.selectedAddressContent}>
            <View style={styles.addressHeader}>
              <Text style={styles.addressName}>{selectedAddress.name}</Text>
              {selectedAddress.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultText}>ค่าเริ่มต้น</Text>
                </View>
              )}
            </View>
            <Text style={styles.addressPhone}>{selectedAddress.phone}</Text>
            <Text style={styles.addressText}>
              {selectedAddress.address} {selectedAddress.subDistrict} {selectedAddress.district} {selectedAddress.province} {selectedAddress.postalCode}
            </Text>
          </View>
        ) : (
          <Text style={styles.selectAddressText}>เลือกที่อยู่จัดส่ง</Text>
        )}
        <Ionicons name="chevron-forward" size={20} color="#71717a" />
      </TouchableOpacity>
    </View>
  );

  const renderShippingStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>วิธีจัดส่ง</Text>

      {shippingMethods.map((method) => (
        <TouchableOpacity
          key={method.id}
          style={[
            styles.optionItem,
            selectedShipping.id === method.id && styles.optionItemSelected
          ]}
          onPress={() => setSelectedShipping(method)}
        >
          <Ionicons name={method.icon} size={24} color="#10b981" />
          <View style={styles.optionContent}>
            <Text style={styles.optionName}>{method.name}</Text>
            <Text style={styles.optionDescription}>{method.description}</Text>
          </View>
          <View style={styles.optionPrice}>
            <Text style={styles.optionPriceText}>
              {method.price === 0 ? 'ฟรี' : `${formatNumber(method.price, currency.locale)} ${currency.code}`}
            </Text>
            {method.price > 0 && (
              <Text style={styles.optionPriceWLD}>
                ≈ {formatNumber(toWLD(method.price, currency.rate), currency.locale)} WLD
              </Text>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPaymentStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>วิธีชำระเงิน</Text>

      {paymentMethods.map((method) => (
        <TouchableOpacity
          key={method.id}
          style={[
            styles.optionItem,
            !method.available && styles.optionItemDisabled,
            selectedPayment.id === method.id && styles.optionItemSelected
          ]}
          onPress={() => method.available && setSelectedPayment(method)}
          disabled={!method.available}
        >
          <Ionicons name={method.icon} size={24} color={method.available ? "#10b981" : "#71717a"} />
          <View style={styles.optionContent}>
            <View style={styles.paymentHeader}>
              <Text style={[
                styles.optionName,
                !method.available && styles.optionNameDisabled
              ]}>
                {method.name}
              </Text>
              {method.comingSoon && (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>เร็วๆ นี้</Text>
                </View>
              )}
            </View>
            <Text style={[
              styles.optionDescription,
              !method.available && styles.optionDescriptionDisabled
            ]}>
              {method.description}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderConfirmStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>ยืนยันคำสั่งซื้อ</Text>

      {/* Order Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>สรุปคำสั่งซื้อ</Text>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>สินค้า</Text>
          <Text style={styles.summaryValue}>{item.title}</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>ราคาสินค้า</Text>
          <View style={styles.summaryPrices}>
            <Text style={styles.summaryValue}>
              {formatNumber(item.priceLocal, currency.locale)} {currency.code}
            </Text>
            <Text style={styles.summaryWLD}>
              ≈ {formatNumber(itemWLD, currency.locale)} WLD
            </Text>
          </View>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>ค่าจัดส่ง ({selectedShipping.name})</Text>
          <View style={styles.summaryPrices}>
            <Text style={styles.summaryValue}>
              {selectedShipping.price === 0 ? 'ฟรี' : `${formatNumber(selectedShipping.price, currency.locale)} ${currency.code}`}
            </Text>
            {selectedShipping.price > 0 && (
              <Text style={styles.summaryWLD}>
                ≈ {formatNumber(shippingWLD, currency.locale)} WLD
              </Text>
            )}
          </View>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabelTotal}>รวมทั้งสิิน</Text>
          <View style={styles.summaryPrices}>
            <Text style={styles.summaryValueTotal}>
              {formatNumber(totalWLD, currency.locale)} WLD
            </Text>
            <Text style={styles.summaryLocal}>
              ≈ {formatNumber((item.priceLocal + selectedShipping.price), currency.locale)} {currency.code}
            </Text>
          </View>
        </View>

        <View style={styles.communityNote}>
          <Text style={styles.communityText}>
            🌟 ส่วนแบ่งชุมชน {item.pct}% (≈ {formatNumber(communityFee, currency.locale)} WLD)
          </Text>
        </View>
      </View>

      {/* Notes */}
      <View style={styles.notesSection}>
        <Text style={styles.notesLabel}>หมายเหตุสำหรับผู้ขาย (ไม่บังคับ)</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="เช่น ส่งช่วงเช้า, ไม่ต้องกดกริ่ง"
          placeholderTextColor="#71717a"
          multiline
          maxLength={200}
        />
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return renderAddressStep();
      case 1: return renderShippingStep();
      case 2: return renderPaymentStep();
      case 3: return renderConfirmStep();
      default: return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return selectedAddress !== null;
      case 1: return selectedShipping !== null;
      case 2: return selectedPayment !== null && selectedPayment.available;
      case 3: return true;
      default: return false;
    }
  };

  const getButtonText = () => {
    if (currentStep === 3) {
      return processing ? 'กำลังดำเนินการ...' : 'ชำระเงิน';
    }
    return 'ถัดไป';
  };

  const handleNext = () => {
    if (currentStep === 3) {
      handleProcessPayment();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.checkoutContainer}>
        <View style={styles.checkoutHeader}>
          <TouchableOpacity onPress={onClose} disabled={processing}>
            <Ionicons name="close" size={24} color="#f4f4f5" />
          </TouchableOpacity>
          <Text style={styles.checkoutTitle}>สั่งซื้อ</Text>
          <View style={{ width: 24 }} />
        </View>

        {renderStepIndicator()}

        <ScrollView style={styles.checkoutContent} showsVerticalScrollIndicator={false}>
          {renderStepContent()}
        </ScrollView>

        <View style={styles.checkoutFooter}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep(prev => prev - 1)}
              disabled={processing}
            >
              <Text style={styles.backButtonText}>ย้อนกลับ</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.nextButton,
              (!canProceed() || processing) && styles.nextButtonDisabled
            ]}
            onPress={handleNext}
            disabled={!canProceed() || processing}
          >
            {processing && <Ionicons name="refresh" size={20} color="#065f46" style={styles.loadingIcon} />}
            <Text style={styles.nextButtonText}>{getButtonText()}</Text>
          </TouchableOpacity>
        </View>

        <AddressModal
          visible={showAddressModal}
          addresses={addresses}
          selectedId={selectedAddress?.id}
          onSelect={setSelectedAddress}
          onClose={() => setShowAddressModal(false)}
          onAddNew={() => {
            setShowAddressModal(false);
            setShowAddAddressModal(true);
          }}
        />

        <AddAddressModal
          visible={showAddAddressModal}
          onSave={handleAddAddress}
          onClose={() => setShowAddAddressModal(false)}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  checkoutContainer: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  checkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  checkoutTitle: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: '600',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  stepCircleInactive: {
    backgroundColor: 'transparent',
    borderColor: '#3f3f46',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepNumberActive: {
    color: '#065f46',
  },
  stepNumberInactive: {
    color: '#71717a',
  },
  stepLabel: {
    fontSize: 11,
  },
  stepLabelActive: {
    color: '#10b981',
    fontWeight: '500',
  },
  stepLabelInactive: {
    color: '#71717a',
  },
  checkoutContent: {
    flex: 1,
  },
  stepContent: {
    padding: 16,
  },
  stepTitle: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  addressSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  selectedAddressContent: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressName: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  defaultBadge: {
    backgroundColor: '#10b981',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultText: {
    color: '#065f46',
    fontSize: 10,
    fontWeight: '500',
  },
  addressPhone: {
    color: '#10b981',
    fontSize: 14,
    marginBottom: 4,
  },
  addressText: {
    color: '#a1a1aa',
    fontSize: 14,
    lineHeight: 18,
  },
  selectAddressText: {
    color: '#71717a',
    fontSize: 16,
    flex: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  optionItemSelected: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  optionItemDisabled: {
    opacity: 0.5,
  },
  optionContent: {
    flex: 1,
    marginLeft: 12,
  },
  optionName: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionNameDisabled: {
    color: '#71717a',
  },
  optionDescription: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  optionDescriptionDisabled: {
    color: '#71717a',
  },
  optionPrice: {
    alignItems: 'flex-end',
  },
  optionPriceText: {
    color: '#f4f4f5',
    fontSize: 14,
    fontWeight: '500',
  },
  optionPriceWLD: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comingSoonBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  comingSoonText: {
    color: '#92400e',
    fontSize: 10,
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#a1a1aa',
    fontSize: 14,
    flex: 1,
  },
  summaryValue: {
    color: '#f4f4f5',
    fontSize: 14,
    textAlign: 'right',
  },
  summaryPrices: {
    alignItems: 'flex-end',
  },
  summaryWLD: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#3f3f46',
    marginVertical: 8,
  },
  summaryLabelTotal: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  summaryValueTotal: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  summaryLocal: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  communityNote: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  communityText: {
    color: '#10b981',
    fontSize: 12,
    textAlign: 'center',
  },
  notesSection: {
    marginTop: 8,
  },
  notesLabel: {
    color: '#a1a1aa',
    fontSize: 14,
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: '#27272a',
    borderRadius: 8,
    padding: 12,
    color: '#f4f4f5',
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  checkoutFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3f3f46',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#a1a1aa',
    fontSize: 16,
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#3f3f46',
  },
  nextButtonText: {
    color: '#065f46',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingIcon: {
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  modalTitle: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: '600',
  },
  addNewText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  addressItemSelected: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  addressItemContent: {
    flex: 1,
  },
  cancelText: {
    color: '#a1a1aa',
    fontSize: 16,
  },
  saveText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    color: '#f4f4f5',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f4f4f5',
    fontSize: 16,
  },
  addressInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formHalf: {
    flex: 1,
  },
  defaultSwitchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  defaultSwitchLabel: {
    color: '#f4f4f5',
    fontSize: 16,
  },
});

export default CheckoutSystem;