package com.studyGroup.backend.service;

import com.studyGroup.backend.dto.ChatMessageDTO;
import com.studyGroup.backend.model.Group;
import com.studyGroup.backend.model.GroupMessage;
import com.studyGroup.backend.model.User;
import com.studyGroup.backend.repository.GroupMessageRepository;
import com.studyGroup.backend.repository.GroupRepository;
import com.studyGroup.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GroupMessageService {

    private final GroupMessageRepository messageRepository;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;

    @Transactional
    public GroupMessage saveMessage(ChatMessageDTO chatMessage) {
        Group group = groupRepository.findById(chatMessage.getGroupId())
            .orElseThrow(() -> new RuntimeException("Group not found"));
            
        User sender = userRepository.findById(chatMessage.getSenderId())
            .orElseThrow(() -> new RuntimeException("User not found"));

        GroupMessage message = new GroupMessage(group, sender, chatMessage.getContent());
        message.setMessageType(chatMessage.getMessageType());
        
        return messageRepository.save(message);
    }

    public List<GroupMessage> getGroupMessages(Long groupId) {
        return messageRepository.findByGroup_GroupIdOrderByTimestampAsc(groupId);
    }
}