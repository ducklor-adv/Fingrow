import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Mock chat data
const mockChats = [
  {
    id: 'chat1',
    productId: 'p1',
    productTitle: 'เก้าอี้ไม้โอ๊ค',
    otherUser: '@ananya',
    lastMessage: 'สภาพยังดีมั้ยคะ?',
    lastMessageTime: '10:30',
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: 'chat2',
    productId: 'p3',
    productTitle: 'โน้ตบุ๊กมือสอง',
    otherUser: '@mild',
    lastMessage: 'ส่งไฟล์สเปคมาให้หน่อยค่ะ',
    lastMessageTime: '09:45',
    unreadCount: 0,
    isOnline: false,
  },
];

const mockMessages = {
  chat1: [
    {
      id: 'm1',
      text: 'สวัสดีครับ สนใจเก้าอี้ไม้โอ๊คนี้ครับ',
      sender: 'me',
      time: '10:25',
      type: 'text',
    },
    {
      id: 'm2',
      text: 'สวัสดีค่ะ ยินดีค่ะ',
      sender: 'other',
      time: '10:26',
      type: 'text',
    },
    {
      id: 'm3',
      text: 'สภาพยังดีมั้ยคะ?',
      sender: 'other',
      time: '10:30',
      type: 'text',
    },
    {
      id: 'm4',
      text: 'ดีมากครับ ใช้งานเพียง 6 เดือน',
      sender: 'me',
      time: '10:32',
      type: 'text',
    },
  ],
};

const ChatListModal = ({ visible, onClose, onSelectChat }) => {
  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => onSelectChat(item)}
    >
      <View style={styles.chatItemLeft}>
        <View style={[styles.userAvatar, item.isOnline && styles.userAvatarOnline]}>
          <Text style={styles.userAvatarText}>
            {item.otherUser.charAt(1).toUpperCase()}
          </Text>
          {item.isOnline && <View style={styles.onlineIndicator} />}
        </View>
      </View>

      <View style={styles.chatItemContent}>
        <View style={styles.chatItemHeader}>
          <Text style={styles.chatItemTitle} numberOfLines={1}>
            {item.productTitle}
          </Text>
          <Text style={styles.chatItemTime}>{item.lastMessageTime}</Text>
        </View>
        <Text style={styles.chatItemUser}>{item.otherUser}</Text>
        <Text style={styles.chatItemLastMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>

      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unreadCount}</Text>
        </View>
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
          <Text style={styles.modalTitle}>แชท</Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={mockChats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          style={styles.chatList}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
};

const ChatModal = ({ visible, chat, onClose, onSendOffer }) => {
  const [messages, setMessages] = useState(mockMessages[chat?.id] || []);
  const [newMessage, setNewMessage] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const flatListRef = useRef(null);

  useEffect(() => {
    if (chat?.id && mockMessages[chat.id]) {
      setMessages(mockMessages[chat.id]);
    }
  }, [chat]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: `m${Date.now()}`,
      text: newMessage.trim(),
      sender: 'me',
      time: new Date().toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      type: 'text',
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Auto scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Mock response after 2 seconds
    setTimeout(() => {
      const responses = [
        'ได้ครับ/ค่ะ',
        'รอสักครู่นะครับ/ค่ะ',
        'ขอบคุณครับ/ค่ะ',
        'อืม...ต้องคิดดูก่อนนะ',
      ];

      const response = {
        id: `m${Date.now()}`,
        text: responses[Math.floor(Math.random() * responses.length)],
        sender: 'other',
        time: new Date().toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        type: 'text',
      };

      setMessages(prev => [...prev, response]);
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 2000);
  };

  const sendOffer = () => {
    if (!offerAmount.trim()) return;

    const offerMessage = {
      id: `m${Date.now()}`,
      text: `ขอเสนอราคา ${offerAmount} บาท`,
      sender: 'me',
      time: new Date().toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      type: 'offer',
      amount: offerAmount,
    };

    setMessages(prev => [...prev, offerMessage]);
    setOfferAmount('');
    setShowOfferModal(false);
    onSendOffer?.(offerAmount);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender === 'me';

    if (item.type === 'offer') {
      return (
        <View style={[styles.messageContainer, isMe ? styles.myMessageContainer : styles.otherMessageContainer]}>
          <View style={[styles.offerBubble, isMe ? styles.myOfferBubble : styles.otherOfferBubble]}>
            <Text style={styles.offerLabel}>💰 ข้อเสนอราคา</Text>
            <Text style={[styles.offerAmount, isMe ? styles.myOfferAmount : styles.otherOfferAmount]}>
              {item.amount} บาท
            </Text>
            {!isMe && (
              <View style={styles.offerActions}>
                <TouchableOpacity style={styles.acceptButton}>
                  <Text style={styles.acceptButtonText}>ยอมรับ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineButton}>
                  <Text style={styles.declineButtonText}>ปฏิเสธ</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.otherMessageTime]}>
              {item.time}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageContainer, isMe ? styles.myMessageContainer : styles.otherMessageContainer]}>
        <View style={[styles.messageBubble, isMe ? styles.myMessageBubble : styles.otherMessageBubble]}>
          <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
            {item.text}
          </Text>
          <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.otherMessageTime]}>
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  if (!chat) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <KeyboardAvoidingView
        style={styles.chatModalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#f4f4f5" />
          </TouchableOpacity>

          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderTitle} numberOfLines={1}>
              {chat.productTitle}
            </Text>
            <View style={styles.chatHeaderUser}>
              <Text style={styles.chatHeaderUsername}>{chat.otherUser}</Text>
              <View style={[styles.statusDot, chat.isOnline ? styles.onlineDot : styles.offlineDot]} />
              <Text style={styles.statusText}>
                {chat.isOnline ? 'ออนไลน์' : 'ไม่ออนไลน์'}
              </Text>
            </View>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.messageInput}
              placeholder="พิมพ์ข้อความ..."
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
              placeholderTextColor="#71717a"
            />

            <TouchableOpacity
              style={styles.offerButton}
              onPress={() => setShowOfferModal(true)}
            >
              <Ionicons name="pricetag" size={20} color="#10b981" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <Ionicons name="send" size={20} color={newMessage.trim() ? "#065f46" : "#71717a"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Offer Modal */}
        <Modal
          visible={showOfferModal}
          animationType="fade"
          transparent={true}
        >
          <View style={styles.offerModalOverlay}>
            <View style={styles.offerModalContainer}>
              <Text style={styles.offerModalTitle}>เสนอราคา</Text>
              <Text style={styles.offerModalSubtitle}>สำหรับ {chat.productTitle}</Text>

              <TextInput
                style={styles.offerInput}
                placeholder="จำนวนเงิน (บาท)"
                value={offerAmount}
                onChangeText={setOfferAmount}
                keyboardType="numeric"
                placeholderTextColor="#71717a"
              />

              <View style={styles.offerModalActions}>
                <TouchableOpacity
                  style={styles.offerModalCancel}
                  onPress={() => setShowOfferModal(false)}
                >
                  <Text style={styles.offerModalCancelText}>ยกเลิก</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.offerModalSend, !offerAmount.trim() && styles.offerModalSendDisabled]}
                  onPress={sendOffer}
                  disabled={!offerAmount.trim()}
                >
                  <Text style={styles.offerModalSendText}>ส่งข้อเสนอ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const ChatSystem = ({ children }) => {
  const [showChatList, setShowChatList] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);

  const openChatList = () => {
    setShowChatList(true);
  };

  const selectChat = (chat) => {
    setSelectedChat(chat);
    setShowChatList(false);
  };

  const closeChat = () => {
    setSelectedChat(null);
  };

  const handleSendOffer = (amount) => {
    Alert.alert('ข้อเสนอส่งแล้ว', `เสนอราคา ${amount} บาท รอการตอบกลับ`);
  };

  return (
    <>
      {children({ openChatList })}

      <ChatListModal
        visible={showChatList}
        onClose={() => setShowChatList(false)}
        onSelectChat={selectChat}
      />

      <ChatModal
        visible={!!selectedChat}
        chat={selectedChat}
        onClose={closeChat}
        onSendOffer={handleSendOffer}
      />
    </>
  );
};

const styles = StyleSheet.create({
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
  chatList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  chatItemLeft: {
    marginRight: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3f3f46',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  userAvatarOnline: {
    borderWidth: 2,
    borderColor: '#10b981',
  },
  userAvatarText: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#09090b',
  },
  chatItemContent: {
    flex: 1,
  },
  chatItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatItemTitle: {
    flex: 1,
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '500',
  },
  chatItemTime: {
    color: '#71717a',
    fontSize: 12,
  },
  chatItemUser: {
    color: '#10b981',
    fontSize: 14,
    marginBottom: 2,
  },
  chatItemLastMessage: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatModalContainer: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  backButton: {
    marginRight: 12,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderTitle: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  chatHeaderUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderUsername: {
    color: '#10b981',
    fontSize: 14,
    marginRight: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  onlineDot: {
    backgroundColor: '#10b981',
  },
  offlineDot: {
    backgroundColor: '#71717a',
  },
  statusText: {
    color: '#71717a',
    fontSize: 12,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  myMessageBubble: {
    backgroundColor: '#10b981',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#27272a',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#065f46',
  },
  otherMessageText: {
    color: '#f4f4f5',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(6, 95, 70, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#71717a',
  },
  offerBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  myOfferBubble: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
    borderBottomRightRadius: 4,
  },
  otherOfferBubble: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: '#f59e0b',
    borderBottomLeftRadius: 4,
  },
  offerLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  offerAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  myOfferAmount: {
    color: '#10b981',
  },
  otherOfferAmount: {
    color: '#f59e0b',
  },
  offerActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#065f46',
    fontSize: 14,
    fontWeight: '500',
  },
  declineButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#27272a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    color: '#f4f4f5',
    fontSize: 16,
  },
  offerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#3f3f46',
  },
  offerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerModalContainer: {
    backgroundColor: '#27272a',
    borderRadius: 16,
    padding: 24,
    width: width * 0.85,
  },
  offerModalTitle: {
    color: '#f4f4f5',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  offerModalSubtitle: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  offerInput: {
    backgroundColor: '#3f3f46',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f4f4f5',
    fontSize: 16,
    marginBottom: 20,
  },
  offerModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  offerModalCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 8,
  },
  offerModalCancelText: {
    color: '#a1a1aa',
    fontSize: 16,
  },
  offerModalSend: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#10b981',
    borderRadius: 8,
  },
  offerModalSendDisabled: {
    backgroundColor: '#3f3f46',
  },
  offerModalSendText: {
    color: '#065f46',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatSystem;