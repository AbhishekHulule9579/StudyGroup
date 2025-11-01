package com.studyGroup.backend.controller;

import com.studyGroup.backend.dto.ChatMessageDTO;
import com.studyGroup.backend.model.PinnedMessage;
import com.studyGroup.backend.repository.PinnedMessageRepository;
import com.studyGroup.backend.repository.GroupMessageRepository;
import com.studyGroup.backend.repository.GroupRepository;
import com.studyGroup.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class PinController {

    private final PinnedMessageRepository pinnedRepo;
    private final GroupMessageRepository messageRepo;
    private final GroupRepository groupRepo;
    private final UserRepository userRepo;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping("/{groupId}/pinned")
    public ResponseEntity<List<ChatMessageDTO>> getPinned(@PathVariable Long groupId) {
        List<PinnedMessage> pins = pinnedRepo.findByGroup_GroupIdOrderByPinnedAtDesc(groupId);
        List<ChatMessageDTO> dtos = pins.stream().map(p -> {
            var m = p.getMessage();
            ChatMessageDTO dto = new ChatMessageDTO();
            dto.setGroupId(m.getGroup().getGroupId());
            dto.setMessageId(m.getId());
            dto.setSenderId(m.getSender().getId());
            dto.setSenderName(m.getSender().getName());
            dto.setContent(m.getContent());
            dto.setTimestamp(m.getTimestamp());
            dto.setMessageType(m.getMessageType());
            return dto;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/{groupId}/messages/{messageId}/pin")
    public ResponseEntity<?> pinMessage(@PathVariable Long groupId, @PathVariable Long messageId) {
        var gm = messageRepo.findById(messageId).orElseThrow(() -> new RuntimeException("Message not found"));
        var pin = new PinnedMessage();
        pin.setGroup(gm.getGroup());
        pin.setMessage(gm);
        pinnedRepo.save(pin);
        // Optionally broadcast pin update
        messagingTemplate.convertAndSend("/topic/group/" + groupId, new ChatMessageDTO());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{groupId}/messages/{messageId}/pin")
    public ResponseEntity<?> unpinMessage(@PathVariable Long groupId, @PathVariable Long messageId) {
        pinnedRepo.deleteByMessage_Id(messageId);
        messagingTemplate.convertAndSend("/topic/group/" + groupId, new ChatMessageDTO());
        return ResponseEntity.ok().build();
    }
}
