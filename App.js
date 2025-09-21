import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  SafeAreaView,
  StatusBar,
  FlatList,
  Modal,
  Picker
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// ===== Constants & Config =====
const COINGECKO_ID = "worldcoin-wld";
const PRESET = {
  THB: { locale: "th-TH", rate: 100, label: "THB • บาท" },
  USD: { locale: "en-US", rate: 3, label: "USD • US$" },
  EUR: { locale: "de-DE", rate: 2.8, label: "EUR • €" },
  JPY: { locale: "ja-JP", rate: 400, label: "JPY • ¥" },
};

const ISO_CODES = [
  "AED","AFN","ALL","AMD","ANG","AOA","ARS","AUD","AWG","AZN","BAM","BBD","BDT","BGN","BHD","BIF","BMD","BND","BOB","BRL","BSD","BTN","BWP","BYN","BZD",
  "CAD","CDF","CHF","CLP","CNY","COP","CRC","CUP","CVE","CZK","DJF","DKK","DOP","DZD","EGP","ERN","ETB","EUR","FJD","FKP","GBP","GEL","GHS","GIP","GMD","GNF","GTQ","GYD",
  "HKD","HNL","HRK","HTG","HUF","IDR","ILS","INR","IQD","IRR","ISK","JMD","JOD","JPY","KES","KGS","KHR","KMF","KPW","KRW","KWD","KYD","KZT","LAK","LBP","LKR","LRD","LSL","LYD",
  "MAD","MDL","MGA","MKD","MMK","MNT","MOP","MRU","MUR","MVR","MWK","MXN","MYR","MZN","NAD","NGN","NIO","NOK","NPR","NZD","OMR","PAB","PEN","PGK","PHP","PKR","PLN","PYG",
  "QAR","RON","RSD","RUB","RWF","SAR","SBD","SCR","SDG","SEK","SGD","SHP","SLE","SLL","SOS","SRD","SSP","STN","SVC","SYP","SZL","THB","TJS","TMT","TND","TOP","TRY","TTD","TWD","TZS",
  "UAH","UGX","USD","UYU","UZS","VED","VES","VND","VUV","WST","XAF","XCD","XDR","XOF","XPF","YER","ZAR","ZMW","ZWL"
];

// ===== API Functions =====
const fetchWLD = async (currency) => {
  try {
    const vs = (currency || "USD").toLowerCase();
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_ID}&vs_currencies=${encodeURIComponent(vs)}`;
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const value = data?.[COINGECKO_ID]?.[vs];
    return typeof value === "number" ? value : null;
  } catch {
    return null;
  }
};

// ===== Currency Context =====
const CurrencyContext = React.createContext({
  code: "THB",
  locale: "th-TH",
  rate: 100,
  isCustom: false,
  fetching: false,
  lastUpdated: null,
  setCurrency: () => {},
  setCustomRate: () => {},
  setCustomLocale: () => {},
});

const useCurrency = () => useContext(CurrencyContext);

// ===== Utility Functions =====
const formatNumber = (number, locale) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(number);

const toWLD = (localPrice, rate) => (rate ? localPrice / rate : 0);

// ===== Mock Data =====
const seedProducts = [
  { id: "p1", title: "เก้าอี้ไม้โอ๊ค", priceLocal: 1200, seller: "@ananya", pct: 3, condition: "ดีมาก", image: "https://via.placeholder.com/150" },
  { id: "p2", title: "โต๊ะทำงาน", priceLocal: 4500, seller: "@bank", pct: 5, condition: "ดี", image: "https://via.placeholder.com/150" },
  { id: "p3", title: "โน้ตบุ๊กมือสอง", priceLocal: 14500, seller: "@mild", pct: 4, condition: "ดี", image: "https://via.placeholder.com/150" },
  { id: "p4", title: "ไมโครเวฟ", priceLocal: 1800, seller: "@pong", pct: 2, condition: "ปานกลาง", image: "https://via.placeholder.com/150" },
];

const initialMyListings = [
  { id: "m1", title: "พัดลมตั้งโต๊ะ", priceLocal: 900, pct: 2, status: "ออนไลน์", date: "2025-09-05" },
  { id: "m2", title: "รองเท้ากีฬา", priceLocal: 1800, pct: 3, status: "ขายแล้ว", date: "2025-08-29" },
  { id: "m3", title: "หูฟังไร้สาย", priceLocal: 1200, pct: 1, status: "ออนไลน์", date: "2025-08-20" },
];

// ===== Reusable Components =====
const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const CustomButton = ({ title, onPress, style, textStyle, icon }) => (
  <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
    {icon && <Ionicons name={icon} size={20} color="#065f46" style={{ marginRight: 8 }} />}
    <Text style={[styles.buttonText, textStyle]}>{title}</Text>
  </TouchableOpacity>
);

const PercentagePills = ({ selectedPct, onSelect }) => (
  <View style={styles.pillsContainer}>
    {[1, 2, 3, 4, 5, 6, 7].map((pct) => (
      <TouchableOpacity
        key={pct}
        style={[
          styles.pill,
          selectedPct === pct ? styles.pillSelected : styles.pillUnselected
        ]}
        onPress={() => onSelect(pct)}
      >
        <Text style={[
          styles.pillText,
          selectedPct === pct ? styles.pillTextSelected : styles.pillTextUnselected
        ]}>
          {pct}% ชุมชน
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ===== Marketplace Screen =====
const MarketplaceScreen = ({ navigation }) => {
  const currency = useCurrency();
  const [products] = useState(seedProducts);

  const renderProduct = ({ item }) => {
    const wldPrice = toWLD(item.priceLocal, currency.rate);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetail', { product: item })}
      >
        <Image source={{ uri: item.image }} style={styles.productImage} />
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.productCondition}>สภาพ: {item.condition} • {item.seller}</Text>
          <View style={styles.priceContainer}>
            <View>
              <Text style={styles.currencyLabel}>{currency.code}</Text>
              <Text style={styles.price}>{formatNumber(item.priceLocal, currency.locale)}</Text>
            </View>
            <View style={styles.priceRight}>
              <Text style={styles.wldPrice}>≈ {formatNumber(wldPrice, currency.locale)} WLD</Text>
              <Text style={styles.communityPct}>ชุมชน {item.pct}%</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>FG</Text>
          </View>
          <Text style={styles.headerTitle}>Fingrow</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.marketRate}>
            1 WLD ≈ {formatNumber(currency.rate, currency.locale)} {currency.code}
            <Text style={styles.liveIndicator}> • live</Text>
          </Text>
        </View>
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.productList}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

// ===== Product Detail Screen =====
const ProductDetailScreen = ({ route, navigation }) => {
  const { product } = route.params;
  const currency = useCurrency();
  const wldPrice = toWLD(product.priceLocal, currency.rate);
  const commission = wldPrice * (product.pct / 100);

  const handleBuy = () => {
    Alert.alert("เดโม", `Checkout → ${product.title}`, [{ text: "OK" }]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.detailContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#e4e4e7" />
          <Text style={styles.backText}>ย้อนกลับ</Text>
        </TouchableOpacity>

        <Card>
          <Image source={{ uri: product.image }} style={styles.productDetailImage} />
        </Card>

        <View style={styles.detailInfo}>
          <Text style={styles.detailTitle}>{product.title}</Text>
          <Text style={styles.detailSubtitle}>ผู้ขาย {product.seller} • สภาพ {product.condition}</Text>

          <Card style={{ marginTop: 16 }}>
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>ราคา ({currency.code})</Text>
                <Text style={styles.priceValue}>{formatNumber(product.priceLocal, currency.locale)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>≈ ราคา (WLD)</Text>
                <Text style={styles.priceValue}>{formatNumber(wldPrice, currency.locale)} WLD</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>แบ่งให้ชุมชน</Text>
                <Text style={styles.communityValue}>
                  {product.pct}% ≈ {formatNumber(commission, currency.locale)} WLD
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>ผู้ขายได้รับสุทธิ</Text>
                <Text style={styles.priceValue}>{formatNumber(wldPrice - commission, currency.locale)} WLD</Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      <View style={styles.buyButtonContainer}>
        <CustomButton
          title="ซื้อด้วย WLD"
          onPress={handleBuy}
          style={styles.buyButton}
          icon="card"
        />
      </View>
    </SafeAreaView>
  );
};

// ===== Create Listing Screen =====
const CreateListingScreen = () => {
  const currency = useCurrency();
  const [showForm, setShowForm] = useState(false);
  const [myListings, setMyListings] = useState(initialMyListings);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "ทั่วไป",
    condition: "ดี",
    priceLocal: "",
    pct: 3,
  });

  const wldPrice = useMemo(() => toWLD(Number(form.priceLocal || 0), currency.rate), [form.priceLocal, currency.rate]);
  const commission = wldPrice * (form.pct / 100);

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.title || Number(form.priceLocal) <= 0) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอกชื่อและราคาสินค้าให้ถูกต้อง");
      return;
    }

    const newItem = {
      id: `m${Date.now()}`,
      title: form.title,
      priceLocal: Number(form.priceLocal),
      pct: form.pct,
      status: "ออนไลน์",
      date: new Date().toISOString().slice(0, 10),
    };

    setMyListings(prev => [newItem, ...prev]);
    setForm({ ...form, title: "", description: "", priceLocal: "", pct: 3 });
    setShowForm(false);
    Alert.alert("สำเร็จ", "เพิ่มรายการขายเรียบร้อย");
  };

  const renderMyListing = ({ item }) => (
    <Card style={styles.listingCard}>
      <View style={styles.listingHeader}>
        <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
        <View style={[styles.statusBadge, item.status === "ขายแล้ว" ? styles.soldBadge : styles.onlineBadge]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.listingDetails}>
        <View style={styles.listingRow}>
          <Text style={styles.listingLabel}>ราคา</Text>
          <Text style={styles.listingValue}>
            {formatNumber(item.priceLocal, currency.locale)} {currency.code} • ≈ {formatNumber(toWLD(item.priceLocal, currency.rate), currency.locale)} WLD
          </Text>
        </View>
        <View style={styles.listingRow}>
          <Text style={styles.listingLabel}>ชุมชน</Text>
          <Text style={styles.communityPercentage}>{item.pct}%</Text>
        </View>
        <View style={styles.listingRow}>
          <Text style={styles.listingLabel}>วันที่</Text>
          <Text style={styles.listingValue}>{item.date}</Text>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.createHeader}>
        <View>
          <Text style={styles.screenTitle}>ขาย</Text>
          <Text style={styles.screenSubtitle}>เพิ่มรายการขายใหม่และดูประวัติการขายของคุณ</Text>
        </View>
        <CustomButton
          title={showForm ? "ซ่อนฟอร์ม" : "+ เพิ่มรายการ"}
          onPress={() => setShowForm(!showForm)}
          style={styles.toggleFormButton}
        />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {showForm && (
          <Card style={styles.formContainer}>
            <Text style={styles.formTitle}>รายละเอียดพื้นฐาน</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ชื่อสินค้า</Text>
              <TextInput
                style={styles.textInput}
                value={form.title}
                onChangeText={(text) => updateForm("title", text)}
                placeholder="เช่น เก้าอี้ไม้โอ๊ค"
                placeholderTextColor="#71717a"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>คำอธิบายสินค้า</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={form.description}
                onChangeText={(text) => updateForm("description", text)}
                placeholder="สภาพ/ตำหนิ/อุปกรณ์ที่ให้มา"
                placeholderTextColor="#71717a"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>หมวดหมู่</Text>
                <Picker
                  selectedValue={form.category}
                  onValueChange={(value) => updateForm("category", value)}
                  style={styles.picker}
                >
                  <Picker.Item label="ทั่วไป" value="ทั่วไป" />
                  <Picker.Item label="อิเล็กทรอนิกส์" value="อิเล็กทรอนิกส์" />
                  <Picker.Item label="คอมพิวเตอร์" value="คอมพิวเตอร์" />
                  <Picker.Item label="เฟอร์นิเจอร์" value="เฟอร์นิเจอร์" />
                  <Picker.Item label="แฟชั่น" value="แฟชั่น" />
                  <Picker.Item label="กีฬา" value="กีฬา" />
                  <Picker.Item label="บ้านและสวน" value="บ้านและสวน" />
                </Picker>
              </View>

              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>สภาพสินค้า</Text>
                <Picker
                  selectedValue={form.condition}
                  onValueChange={(value) => updateForm("condition", value)}
                  style={styles.picker}
                >
                  <Picker.Item label="ใหม่" value="ใหม่" />
                  <Picker.Item label="สภาพเหมือนใหม่" value="สภาพเหมือนใหม่" />
                  <Picker.Item label="ดีมาก" value="ดีมาก" />
                  <Picker.Item label="ดี" value="ดี" />
                  <Picker.Item label="พอใช้" value="พอใช้" />
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ราคา ({currency.code})</Text>
              <TextInput
                style={styles.textInput}
                value={form.priceLocal}
                onChangeText={(text) => updateForm("priceLocal", text)}
                placeholder="เช่น 1200"
                placeholderTextColor="#71717a"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>เลือก % แบ่งให้ชุมชน (1–7%)</Text>
              <PercentagePills
                selectedPct={form.pct}
                onSelect={(pct) => updateForm("pct", pct)}
              />
            </View>

            <Card style={styles.priceCalculation}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{currency.code}</Text>
                <Text style={styles.priceValue}>{formatNumber(Number(form.priceLocal || 0), currency.locale)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>≈ WLD</Text>
                <Text style={styles.priceValue}>{formatNumber(wldPrice, currency.locale)} WLD</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>ชุมชน {form.pct}%</Text>
                <Text style={styles.communityValue}>≈ {formatNumber(commission, currency.locale)} WLD</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>ผู้ขายได้รับ</Text>
                <Text style={styles.priceValue}>{formatNumber(wldPrice - commission, currency.locale)} WLD</Text>
              </View>
              <Text style={styles.priceNote}>* ตั้งราคาเป็น {currency.code} ระบบจะแปลงเป็น WLD อัตโนมัติ</Text>
            </Card>

            <CustomButton
              title="โพสต์ขาย"
              onPress={handleSubmit}
              style={styles.submitButton}
              icon="add-circle"
            />
          </Card>
        )}

        <Card style={styles.myListingsContainer}>
          <Text style={styles.formTitle}>ประวัติการขายของฉัน</Text>
          <Text style={styles.formSubtitle}>ดูสถานะรายการที่คุณเคยโพสต์</Text>

          {myListings.length === 0 ? (
            <Text style={styles.emptyState}>
              ยังไม่มีรายการขาย — กดปุ่ม "+ เพิ่มรายการ" เพื่อเริ่มขาย
            </Text>
          ) : (
            <FlatList
              data={myListings}
              renderItem={renderMyListing}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

// ===== Orders Screen =====
const OrdersScreen = () => (
  <SafeAreaView style={styles.container}>
    <Card style={styles.centeredCard}>
      <Text style={styles.screenTitle}>ออเดอร์</Text>
      <Text style={styles.screenSubtitle}>ติดตามสถานะการสั่งซื้อ/ขายและการส่งมอบ</Text>
      <Text style={styles.emptyState}>(ยังไม่มีออเดอร์ในเดโมนี้)</Text>
    </Card>
  </SafeAreaView>
);

// ===== Referral Screen =====
const ReferralScreen = () => {
  const currency = useCurrency();
  const referralLink = "https://fingrow.app/r/FG-jo-1a2b";

  const copyToClipboard = () => {
    // In a real app, you'd use expo-clipboard
    Alert.alert("คัดลอกแล้ว", "คัดลอกลิงก์เรียบร้อย");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <Card style={styles.referralCard}>
          <Text style={styles.formTitle}>Referral Center</Text>
          <Text style={styles.formSubtitle}>แชร์ลิงก์ / QR เพื่อเชิญเพื่อน (5 สาย / 7 ชั้น)</Text>

          <View style={styles.linkContainer}>
            <TextInput
              style={styles.linkInput}
              value={referralLink}
              editable={false}
            />
            <CustomButton
              title="คัดลอก"
              onPress={copyToClipboard}
              style={styles.copyButton}
            />
          </View>

          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrText}>QR Code</Text>
          </View>

          <View style={styles.attributionRules}>
            <Text style={styles.ruleText}>• Attribution: first-touch + last valid click ภายใน 7 วัน</Text>
            <Text style={styles.ruleText}>• Qualified เมื่อยอดซื้อสะสม ≥ 500 {currency.code} และยอดขายสะสม ≥ 500 {currency.code}</Text>
          </View>
        </Card>

        <Card style={styles.networkCard}>
          <Text style={styles.formTitle}>Network Snapshot (ย่อ)</Text>
          <Text style={styles.formSubtitle}>มุมมองเครือข่ายแบบตัวอย่าง</Text>

          {["สาย 1 • 12 คน", "สาย 2 • 8 คน", "สาย 3 • 5 คน", "สาย 4 • 4 คน", "สาย 5 • 2 คน"].map((line, index) => (
            <View key={index} style={styles.networkRow}>
              <Text style={styles.lineLabel}>{line.split(" • ")[0]}</Text>
              <Text style={styles.lineCount}>{line.split(" • ")[1]}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

// ===== Earnings Screen =====
const EarningsScreen = () => {
  const currency = useCurrency();
  const [myPct, setMyPct] = useState(3);
  const [buyAmount, setBuyAmount] = useState("260");
  const [sellAmount, setSellAmount] = useState("480");

  const lines = [
    { name: "สาย 1", members: 12, pool: 800 },
    { name: "สาย 2", members: 8, pool: 700 },
    { name: "สาย 3", members: 5, pool: 600 },
    { name: "สาย 4", members: 4, pool: 500 },
    { name: "สาย 5", members: 2, pool: 400 },
  ];

  const totalPool = lines.reduce((sum, line) => sum + line.pool, 0);
  const totalMembers = lines.reduce((sum, line) => sum + line.members, 0);
  const totalShare = (myPct / 7) * 14 * totalPool;

  const buyProgress = Math.min(100, (Number(buyAmount) / 500) * 100);
  const sellProgress = Math.min(100, (Number(sellAmount) / 500) * 100);
  const qualified = Number(buyAmount) >= 500 && Number(sellAmount) >= 500;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <Card style={styles.earningsCard}>
          <Text style={styles.formTitle}>Earnings (14% Split)</Text>
          <Text style={styles.formSubtitle}>สูตร: (เปอร์เซ็นต์ของฉัน/7) × 14 × Pool</Text>

          <View style={styles.earningsStats}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>สมาชิกทั้งหมดในเครือข่าย</Text>
              <Text style={styles.statValue}>{formatNumber(totalMembers, currency.locale)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>ยอดรวมส่วนแบ่งกลุ่ม (Pool)</Text>
              <Text style={styles.statValueBold}>{formatNumber(totalPool, currency.locale)} WLD</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>เปอร์เซ็นต์ที่ฉันแบ่ง (1–7)</Text>
            <PercentagePills selectedPct={myPct} onSelect={setMyPct} />
          </View>

          <View style={styles.totalEarnings}>
            <Text style={styles.earningsLabel}>ฉันได้รับรวม (ตามสูตร)</Text>
            <Text style={styles.earningsAmount}>{formatNumber(totalShare, currency.locale)} WLD</Text>
            <Text style={styles.earningsLocal}>≈ {formatNumber(totalShare * currency.rate, currency.locale)} {currency.code}</Text>
          </View>
        </Card>

        <Card style={styles.qualificationCard}>
          <Text style={styles.formTitle}>Qualification</Text>
          <Text style={styles.formSubtitle}>ต้องมียอดซื้อสะสม ≥ 500 {currency.code} และยอดขายสะสม ≥ 500 {currency.code}</Text>

          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>ยอดซื้อสะสม</Text>
              <Text style={styles.progressText}>{buyAmount} / 500 {currency.code}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${buyProgress}%` }]} />
            </View>
            <TextInput
              style={styles.progressInput}
              value={buyAmount}
              onChangeText={setBuyAmount}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>ยอดขายสะสม</Text>
              <Text style={styles.progressText}>{sellAmount} / 500 {currency.code}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${sellProgress}%` }]} />
            </View>
            <TextInput
              style={styles.progressInput}
              value={sellAmount}
              onChangeText={setSellAmount}
              keyboardType="numeric"
            />
          </View>

          <View style={[
            styles.qualificationStatus,
            qualified ? styles.qualifiedStatus : styles.unqualifiedStatus
          ]}>
            <Text style={styles.statusText}>
              สถานะ: {qualified ? "พร้อมรับสิทธิ์" : "ยังไม่ครบเงื่อนไข"}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

// ===== Profile Screen =====
const ProfileScreen = () => {
  const currency = useCurrency();
  const [selectedCurrency, setSelectedCurrency] = useState(currency.code);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <Card style={styles.profileCard}>
          <Text style={styles.screenTitle}>โปรไฟล์ผู้ใช้</Text>
          <Text style={styles.screenSubtitle}>ข้อมูลพื้นฐานและการตั้งค่า</Text>

          {PRESET[currency.code] && (
            <View style={styles.marketRateCard}>
              <Text style={styles.marketRateText}>
                ตลาดสด: 1 WLD ≈ {formatNumber(currency.rate, currency.locale)} {currency.code}
              </Text>
              <Text style={styles.updateTime}>
                {currency.fetching ? "กำลังอัปเดต…" : currency.lastUpdated ? new Date(currency.lastUpdated).toLocaleTimeString() : ""}
              </Text>
            </View>
          )}

          <View style={styles.profileInfo}>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>ชื่อผู้ใช้</Text>
              <Text style={styles.profileValue}>@jo</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>สกุลเงิน (Local)</Text>
              <TextInput
                style={styles.textInput}
                value={selectedCurrency}
                onChangeText={setSelectedCurrency}
                placeholder="พิมพ์รหัส เช่น THB, USD"
                placeholderTextColor="#71717a"
              />
              <Text style={styles.inputHelp}>รองรับทุกสกุลเงินตามมาตรฐาน ISO 4217</Text>
            </View>

            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>อัตราแปลง</Text>
              <Text style={styles.profileValue}>
                1 WLD ≈ {formatNumber(currency.rate, currency.locale)} {currency.code} {!currency.isCustom && <Text style={styles.liveLabel}>(live)</Text>}
              </Text>
            </View>
          </View>

          <View style={styles.walletSection}>
            <Text style={styles.formTitle}>กระเป๋า WLD</Text>
            <Text style={styles.formSubtitle}>เชื่อมต่อและตรวจยอด</Text>

            <View style={styles.walletCard}>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>สถานะ</Text>
                <Text style={styles.walletStatus}>ยังไม่เชื่อมต่อ</Text>
              </View>
              <CustomButton
                title="เชื่อมต่อกระเป๋า"
                onPress={() => Alert.alert("เดโม", "เชื่อมต่อกระเป๋า WLD")}
                style={styles.connectWalletButton}
                icon="wallet"
              />
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

// ===== Navigation Setup =====
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const MarketStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MarketplaceList" component={MarketplaceScreen} />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
  </Stack.Navigator>
);

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarActiveTintColor: '#10b981',
      tabBarInactiveTintColor: '#d4d4d8',
      tabBarLabelStyle: styles.tabLabel,
    }}
  >
    <Tab.Screen
      name="Market"
      component={MarketStack}
      options={{
        tabBarLabel: 'ตลาด',
        tabBarIcon: ({ color }) => <Ionicons name="storefront" size={20} color={color} />,
      }}
    />
    <Tab.Screen
      name="Create"
      component={CreateListingScreen}
      options={{
        tabBarLabel: 'ขาย',
        tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={20} color={color} />,
      }}
    />
    <Tab.Screen
      name="Orders"
      component={OrdersScreen}
      options={{
        tabBarLabel: 'ออเดอร์',
        tabBarIcon: ({ color }) => <Ionicons name="receipt" size={20} color={color} />,
      }}
    />
    <Tab.Screen
      name="Referral"
      component={ReferralScreen}
      options={{
        tabBarLabel: 'เชิญ',
        tabBarIcon: ({ color }) => <Ionicons name="people" size={20} color={color} />,
      }}
    />
    <Tab.Screen
      name="Earnings"
      component={EarningsScreen}
      options={{
        tabBarLabel: 'รายได้',
        tabBarIcon: ({ color }) => <Ionicons name="trending-up" size={20} color={color} />,
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarLabel: 'ฉัน',
        tabBarIcon: ({ color }) => <Ionicons name="person" size={20} color={color} />,
      }}
    />
  </Tab.Navigator>
);

// ===== Main App Component =====
export default function App() {
  const [code, setCode] = useState("THB");
  const [customRate, setCustomRate] = useState(100);
  const [customLocale, setCustomLocale] = useState("th-TH");
  const [marketRate, setMarketRate] = useState(null);
  const [lastFetchAt, setLastFetchAt] = useState(null);
  const [fetching, setFetching] = useState(false);

  // Live WLD rate fetch
  useEffect(() => {
    let active = true;
    (async () => {
      if (!PRESET[code]) {
        setMarketRate(null);
        setLastFetchAt(null);
        setFetching(false);
        return;
      }
      setFetching(true);
      const value = await fetchWLD(code);
      if (active) {
        if (typeof value === "number") {
          setMarketRate(value);
          setLastFetchAt(new Date().toISOString());
        }
        setFetching(false);
      }
    })();
    return () => { active = false; };
  }, [code]);

  const preset = PRESET[code];
  const currencyContext = {
    code,
    locale: preset ? preset.locale : customLocale,
    rate: preset ? marketRate ?? preset.rate : customRate,
    isCustom: !preset,
    fetching,
    lastUpdated: lastFetchAt,
    setCurrency: (c) => setCode((c || "THB").toUpperCase()),
    setCustomRate: setCustomRate,
    setCustomLocale: setCustomLocale,
  };

  return (
    <CurrencyContext.Provider value={currencyContext}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    </CurrencyContext.Provider>
  );
}

// ===== Styles =====
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  scrollContainer: {
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  marketRate: {
    color: '#a1a1aa',
    fontSize: 11,
  },
  liveIndicator: {
    color: '#10b981',
    fontSize: 10,
  },
  card: {
    backgroundColor: 'rgba(39, 39, 42, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#065f46',
    fontSize: 14,
    fontWeight: '600',
  },
  productList: {
    padding: 12,
  },
  productCard: {
    backgroundColor: 'rgba(39, 39, 42, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#27272a',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  productCondition: {
    color: '#a1a1aa',
    fontSize: 12,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  currencyLabel: {
    color: '#a1a1aa',
    fontSize: 11,
  },
  price: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '600',
  },
  priceRight: {
    alignItems: 'flex-end',
  },
  wldPrice: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  communityPct: {
    color: '#10b981',
    fontSize: 12,
  },
  detailContainer: {
    flex: 1,
    padding: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    color: '#e4e4e7',
    fontSize: 14,
    marginLeft: 8,
  },
  productDetailImage: {
    width: '100%',
    height: 224,
    borderRadius: 12,
    backgroundColor: '#27272a',
  },
  detailInfo: {
    marginTop: 16,
  },
  detailTitle: {
    color: '#f4f4f5',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailSubtitle: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  priceBreakdown: {
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  priceValue: {
    color: '#f4f4f5',
    fontSize: 14,
    fontWeight: '600',
  },
  communityValue: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
  },
  buyButtonContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  buyButton: {
    backgroundColor: '#10b981',
  },
  createHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
  },
  screenTitle: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: '600',
  },
  screenSubtitle: {
    color: '#a1a1aa',
    fontSize: 12,
    marginTop: 2,
  },
  toggleFormButton: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  formContainer: {
    marginBottom: 16,
  },
  formTitle: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  formSubtitle: {
    color: '#a1a1aa',
    fontSize: 12,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#a1a1aa',
    fontSize: 12,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f4f4f5',
    fontSize: 14,
  },
  textArea: {
    height: 96,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputHalf: {
    flex: 1,
  },
  picker: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 12,
    color: '#f4f4f5',
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillSelected: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  pillUnselected: {
    backgroundColor: 'transparent',
    borderColor: '#3f3f46',
  },
  pillText: {
    fontSize: 12,
  },
  pillTextSelected: {
    color: '#065f46',
  },
  pillTextUnselected: {
    color: '#e4e4e7',
  },
  priceCalculation: {
    marginBottom: 16,
  },
  priceNote: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#10b981',
  },
  myListingsContainer: {
    marginBottom: 16,
  },
  listingCard: {
    backgroundColor: 'rgba(39, 39, 42, 0.5)',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listingTitle: {
    color: '#f4f4f5',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  soldBadge: {
    backgroundColor: 'rgba(113, 113, 122, 0.3)',
    borderColor: '#52525b',
  },
  onlineBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    borderColor: '#059669',
  },
  statusText: {
    color: '#e4e4e7',
    fontSize: 11,
  },
  listingDetails: {
    gap: 4,
  },
  listingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listingLabel: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  listingValue: {
    color: '#e4e4e7',
    fontSize: 12,
  },
  communityPercentage: {
    color: '#10b981',
    fontSize: 12,
  },
  centeredCard: {
    margin: 12,
    alignItems: 'center',
  },
  emptyState: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  referralCard: {
    marginBottom: 16,
  },
  linkContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  linkInput: {
    flex: 1,
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f4f4f5',
    fontSize: 14,
  },
  copyButton: {
    backgroundColor: '#27272a',
    paddingHorizontal: 12,
  },
  qrPlaceholder: {
    height: 160,
    backgroundColor: '#27272a',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  qrText: {
    color: '#71717a',
    fontSize: 14,
  },
  attributionRules: {
    gap: 4,
  },
  ruleText: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  networkCard: {
    marginBottom: 16,
  },
  networkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(39, 39, 42, 0.6)',
  },
  lineLabel: {
    color: '#f4f4f5',
    fontSize: 14,
  },
  lineCount: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  earningsCard: {
    marginBottom: 16,
  },
  earningsStats: {
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  statValue: {
    color: '#f4f4f5',
    fontSize: 14,
    fontWeight: '500',
  },
  statValueBold: {
    color: '#f4f4f5',
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalEarnings: {
    alignItems: 'center',
    marginTop: 16,
  },
  earningsLabel: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  earningsAmount: {
    color: '#f4f4f5',
    fontSize: 24,
    fontWeight: '600',
    marginTop: 4,
  },
  earningsLocal: {
    color: '#a1a1aa',
    fontSize: 12,
    marginTop: 2,
  },
  qualificationCard: {
    marginBottom: 16,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  progressText: {
    color: '#e4e4e7',
    fontSize: 14,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#27272a',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: 8,
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressInput: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#f4f4f5',
    fontSize: 14,
    width: 160,
  },
  qualificationStatus: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  qualifiedStatus: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#059669',
  },
  unqualifiedStatus: {
    backgroundColor: 'rgba(39, 39, 42, 0.6)',
    borderColor: '#3f3f46',
  },
  profileCard: {
    marginBottom: 16,
  },
  marketRateCard: {
    backgroundColor: 'rgba(39, 39, 42, 0.6)',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  marketRateText: {
    color: '#a1a1aa',
    fontSize: 11,
  },
  updateTime: {
    color: '#a1a1aa',
    fontSize: 11,
  },
  profileInfo: {
    gap: 16,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileLabel: {
    color: '#f4f4f5',
    fontSize: 14,
  },
  profileValue: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  inputHelp: {
    color: '#a1a1aa',
    fontSize: 12,
    marginTop: 4,
  },
  liveLabel: {
    fontSize: 11,
  },
  walletSection: {
    marginTop: 16,
  },
  walletCard: {
    backgroundColor: 'rgba(39, 39, 42, 0.6)',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  walletStatus: {
    color: '#f59e0b',
    fontSize: 14,
  },
  connectWalletButton: {
    backgroundColor: '#27272a',
    marginTop: 12,
  },
  tabBar: {
    backgroundColor: 'rgba(9, 9, 11, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(39, 39, 42, 0.8)',
    height: 80,
    paddingBottom: 20,
  },
  tabLabel: {
    fontSize: 11,
  },
});