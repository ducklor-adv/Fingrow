import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

const { width } = Dimensions.get('window');

const SearchAndFilter = ({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  onApplyFilters,
  products = []
}) => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);
  const [showSortModal, setShowSortModal] = useState(false);

  const categories = [
    "ทั้งหมด", "อิเล็กทรอนิกส์", "คอมพิวเตอร์", "เฟอร์นิเจอร์",
    "แฟชั่น", "กีฬา", "บ้านและสวน", "ทั่วไป"
  ];

  const conditions = [
    "ทั้งหมด", "ใหม่", "สภาพเหมือนใหม่", "ดีมาก", "ดี", "พอใช้"
  ];

  const sortOptions = [
    { label: "ใหม่ล่าสุด", value: "newest" },
    { label: "ราคาต่ำ-สูง", value: "price_low" },
    { label: "ราคาสูง-ต่ำ", value: "price_high" },
    { label: "% ชุมชนสูงสุด", value: "community_high" },
  ];

  const updateTempFilter = (key, value) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    onFiltersChange(tempFilters);
    onApplyFilters();
    setShowFilterModal(false);
  };

  const resetFilters = () => {
    const resetFilters = {
      category: "ทั้งหมด",
      condition: "ทั้งหมด",
      minPrice: "",
      maxPrice: "",
      minCommunity: "",
      maxCommunity: "",
    };
    setTempFilters(resetFilters);
    onFiltersChange(resetFilters);
    onApplyFilters();
    setShowFilterModal(false);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category !== "ทั้งหมด") count++;
    if (filters.condition !== "ทั้งหมด") count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.minCommunity) count++;
    if (filters.maxCommunity) count++;
    return count;
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#71717a" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ค้นหาสินค้า..."
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholderTextColor="#71717a"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => onSearchChange("")}>
            <Ionicons name="close-circle" size={20} color="#71717a" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter and Sort Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="options" size={16} color="#10b981" />
          <Text style={styles.filterButtonText}>
            กรอง {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="swap-vertical" size={16} color="#10b981" />
          <Text style={styles.sortButtonText}>
            {sortOptions.find(option => option.value === sortBy)?.label || "เรียงลำดับ"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Summary */}
      {searchQuery && (
        <Text style={styles.resultsSummary}>
          ผลการค้นหา "{searchQuery}" พบ {products.length} รายการ
        </Text>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Text style={styles.cancelButton}>ยกเลิก</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>กรองสินค้า</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.resetButton}>รีเซ็ต</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Category Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>หมวดหมู่</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={tempFilters.category}
                  onValueChange={(value) => updateTempFilter("category", value)}
                  style={styles.picker}
                >
                  {categories.map((category) => (
                    <Picker.Item key={category} label={category} value={category} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Condition Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>สภาพสินค้า</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={tempFilters.condition}
                  onValueChange={(value) => updateTempFilter("condition", value)}
                  style={styles.picker}
                >
                  {conditions.map((condition) => (
                    <Picker.Item key={condition} label={condition} value={condition} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Price Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>ช่วงราคา (THB)</Text>
              <View style={styles.rangeContainer}>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="ราคาต่ำสุด"
                  value={tempFilters.minPrice}
                  onChangeText={(value) => updateTempFilter("minPrice", value)}
                  keyboardType="numeric"
                  placeholderTextColor="#71717a"
                />
                <Text style={styles.rangeSeparator}>-</Text>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="ราคาสูงสุด"
                  value={tempFilters.maxPrice}
                  onChangeText={(value) => updateTempFilter("maxPrice", value)}
                  keyboardType="numeric"
                  placeholderTextColor="#71717a"
                />
              </View>
            </View>

            {/* Community Percentage Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>% แบ่งชุมชน</Text>
              <View style={styles.rangeContainer}>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="ต่ำสุด (%)"
                  value={tempFilters.minCommunity}
                  onChangeText={(value) => updateTempFilter("minCommunity", value)}
                  keyboardType="numeric"
                  placeholderTextColor="#71717a"
                />
                <Text style={styles.rangeSeparator}>-</Text>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="สูงสุด (%)"
                  value={tempFilters.maxCommunity}
                  onChangeText={(value) => updateTempFilter("maxCommunity", value)}
                  keyboardType="numeric"
                  placeholderTextColor="#71717a"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>ใช้ตัวกรอง</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.sortModalOverlay}>
          <View style={styles.sortModalContainer}>
            <Text style={styles.sortModalTitle}>เรียงลำดับตาม</Text>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortOption,
                  sortBy === option.value && styles.sortOptionSelected
                ]}
                onPress={() => {
                  onSortChange(option.value);
                  setShowSortModal(false);
                }}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortBy === option.value && styles.sortOptionTextSelected
                ]}>
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Ionicons name="checkmark" size={20} color="#10b981" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.sortCancelButton}
              onPress={() => setShowSortModal(false)}
            >
              <Text style={styles.sortCancelText}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#09090b',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f4f4f5',
    fontSize: 16,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  filterButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
  },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  sortButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
  },
  resultsSummary: {
    color: '#a1a1aa',
    fontSize: 12,
    marginTop: 8,
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
  cancelButton: {
    color: '#a1a1aa',
    fontSize: 16,
  },
  modalTitle: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: '600',
  },
  resetButton: {
    color: '#ef4444',
    fontSize: 16,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#27272a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  picker: {
    color: '#f4f4f5',
  },
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rangeInput: {
    flex: 1,
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f4f4f5',
    fontSize: 14,
  },
  rangeSeparator: {
    color: '#a1a1aa',
    fontSize: 16,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  applyButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#065f46',
    fontSize: 16,
    fontWeight: '600',
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModalContainer: {
    backgroundColor: '#27272a',
    borderRadius: 16,
    padding: 16,
    width: width * 0.8,
    maxWidth: 300,
  },
  sortModalTitle: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  sortOptionSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  sortOptionText: {
    color: '#f4f4f5',
    fontSize: 16,
  },
  sortOptionTextSelected: {
    color: '#10b981',
    fontWeight: '500',
  },
  sortCancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#3f3f46',
  },
  sortCancelText: {
    color: '#a1a1aa',
    fontSize: 16,
  },
});

export default SearchAndFilter;