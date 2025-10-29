package com.studyGroup.backend.controller;

import com.studyGroup.backend.dto.ChatMessageDTO;
import com.studyGroup.backend.model.GroupMessage;
import com.studyGroup.backend.service.GroupMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173") // Add your frontend URL here
public class GroupChatController {

    private final GroupMessageService groupMessageService;

    @GetMapping("/{groupId}/messages")
    public ResponseEntity<List<ChatMessageDTO>> getGroupMessages(@PathVariable Long groupId) {
        List<GroupMessage> messages = groupMessageService.getGroupMessages(groupId);
        
        List<ChatMessageDTO> messageDTOs = messages.stream()
            .map(message -> new ChatMessageDTO(
                message.getGroup().getGroupId(),
                message.getSender().getId(),
                message.getSender().getName(),
                message.getContent(),
                message.getTimestamp(),
                message.getMessageType()
            ))
            .collect(Collectors.toList());
            
        return ResponseEntity.ok(messageDTOs);
    }
}