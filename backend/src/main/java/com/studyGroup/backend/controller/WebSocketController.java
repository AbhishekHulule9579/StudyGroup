package com.studyGroup.backend.controller;

import com.studyGroup.backend.dto.ChatMessageDTO;
import com.studyGroup.backend.model.GroupMessage;
import com.studyGroup.backend.service.GroupMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;

@Controller
@RequiredArgsConstructor
public class WebSocketController {

    private final GroupMessageService groupMessageService;

    @MessageMapping("/chat.sendMessage/{groupId}")
    @SendTo("/topic/group/{groupId}")
    public ChatMessageDTO sendMessage(@DestinationVariable Long groupId, ChatMessageDTO chatMessage) {
        chatMessage.setGroupId(groupId); // Ensure groupId is set from path variable
        chatMessage.setTimestamp(LocalDateTime.now()); // Set server-side timestamp
        
        // Save the message and return it
        GroupMessage savedMessage = groupMessageService.saveMessage(chatMessage);
        
        // Convert to DTO and return
        return new ChatMessageDTO(
            savedMessage.getGroup().getGroupId(),
            savedMessage.getSender().getId(),
            savedMessage.getSender().getName(),
            savedMessage.getContent(),
            savedMessage.getTimestamp(),
            savedMessage.getMessageType()
        );
    }
}