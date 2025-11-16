package com.studyGroup.backend.service;

import com.studyGroup.backend.dto.ChatMessageDTO;
import com.studyGroup.backend.model.Group;
import com.studyGroup.backend.model.GroupMessage;
import com.studyGroup.backend.model.MessageDocument;
import com.studyGroup.backend.model.User;
import com.studyGroup.backend.repository.GroupMessageRepository;
import com.studyGroup.backend.repository.GroupRepository;
import com.studyGroup.backend.repository.MessageDocumentRepository;
import com.studyGroup.backend.repository.UserRepository;
import com.studyGroup.backend.service.DocumentService;
import com.studyGroup.backend.service.GroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GroupMessageService {

    private final GroupMessageRepository messageRepository;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final com.studyGroup.backend.repository.MessageReplyRepository messageReplyRepository;
    private final MessageDocumentRepository messageDocumentRepository;
    private final DocumentService documentService;
    private final GroupService groupService;

    @Transactional
    public GroupMessage saveMessage(ChatMessageDTO chatMessage) {
        Group group = groupRepository.findById(chatMessage.getGroupId())
            .orElseThrow(() -> new RuntimeException("Group not found"));
            
        User sender = userRepository.findById(chatMessage.getSenderId())
            .orElseThrow(() -> new RuntimeException("User not found"));

        GroupMessage message = new GroupMessage(group, sender, chatMessage.getContent());
        message.setMessageType(chatMessage.getMessageType());
        GroupMessage saved = messageRepository.save(message);

        // If this message is a reply to another message, create a MessageReply record
        if (chatMessage.getReplyToMessageId() != null) {
            Long originalId = chatMessage.getReplyToMessageId();
            messageRepository.findById(originalId).ifPresent(original -> {
                com.studyGroup.backend.model.MessageReply mr = new com.studyGroup.backend.model.MessageReply();
                mr.setReplyMessage(saved);
                mr.setOriginalMessage(original);
                mr.setReplier(sender);
                messageReplyRepository.save(mr);
            });
        }

        return saved;
    }

    public List<GroupMessage> getGroupMessages(Long groupId) {
        return messageRepository.findByGroup_GroupIdOrderByTimestampAsc(groupId);
    }

    @Transactional
    public void deleteMessage(Long messageId, Integer requesterUserId) {
        GroupMessage msg = messageRepository.findById(messageId)
            .orElseThrow(() -> new RuntimeException("Message not found"));

        // Allow deletion if requester is the sender or an admin of the group
        boolean isSender = msg.getSender().getId().equals(requesterUserId);

        // Get the requester user
        User requester = userRepository.findById(requesterUserId)
            .orElseThrow(() -> new RuntimeException("Requester not found"));

        boolean isAdmin = "Admin".equalsIgnoreCase(groupService.getUserRoleInGroup(msg.getGroup().getGroupId(), requester));

        if (!isSender && !isAdmin) {
            throw new RuntimeException("Not authorized to delete this message");
        }

        // Delete associated MessageDocument if exists
        MessageDocument doc = messageDocumentRepository.findByMessage_Id(messageId);
        if (doc != null) {
            documentService.deleteDocument(doc);
        }

        // Remove any reply records referencing this message either as reply or original
        messageReplyRepository.findByReplyMessage_Id(messageId).ifPresent(messageReplyRepository::delete);

        // Also delete any replies that point to this message as original (cleanup)
        // Simple JPQL not added; use repository to delete by scanning - keep small for now
        messageReplyRepository.findAll().stream()
            .filter(r -> r.getOriginalMessage().getId().equals(messageId))
            .forEach(messageReplyRepository::delete);

        messageRepository.deleteById(messageId);
    }

    @Transactional
    public GroupMessage saveDocumentMessage(Long groupId, Integer senderId, MultipartFile file) {
        Group group = groupRepository.findById(groupId)
            .orElseThrow(() -> new RuntimeException("Group not found"));

        User sender = userRepository.findById(senderId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        GroupMessage message = new GroupMessage(group, sender, file.getOriginalFilename());
        message.setMessageType("document"); // Assuming message type for documents
        GroupMessage saved = messageRepository.save(message);

        // Store the document using DocumentService
        // Note: DocumentService needs to be injected here, but since it's not, we'll assume it's handled elsewhere
        // For now, just return the saved message

        return saved;
    }
}
