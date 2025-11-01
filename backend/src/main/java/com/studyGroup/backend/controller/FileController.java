package com.studyGroup.backend.controller;

import com.studyGroup.backend.dto.ChatMessageDTO;
import com.studyGroup.backend.model.GroupFile;
// file messages are handled here; GroupMessageService not required for this simplified flow
import com.studyGroup.backend.repository.GroupFileRepository;
import com.studyGroup.backend.repository.GroupRepository;
import com.studyGroup.backend.service.GroupMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class FileController {

    private final GroupFileRepository fileRepo;
    private final GroupRepository groupRepo;
    private final GroupMessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    // Directory to store uploaded files (relative to project root)
    private final Path storageDir = Paths.get("./uploads");

    @PostMapping("/{groupId}/files")
    public ResponseEntity<?> uploadFile(@PathVariable Long groupId,
                                        @RequestParam("file") MultipartFile file,
                                        @RequestParam(value = "senderId", required = false) Integer senderId,
                                        @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            if (!Files.exists(storageDir)) Files.createDirectories(storageDir);

            String original = StringUtils.cleanPath(file.getOriginalFilename());
            String stored = System.currentTimeMillis() + "-" + original;
            Path target = storageDir.resolve(stored);
            Files.copy(file.getInputStream(), target);

            // resolve uploader from token if needed; for now expect senderId provided in a header or token
            // We'll assume the frontend includes Authorization header and GroupMessageService will map senderId from payload

            // Create GroupFile record
            GroupFile gf = new GroupFile();
            gf.setGroup(groupRepo.findById(groupId).orElseThrow(() -> new RuntimeException("Group not found")));
            // uploader resolution is not implemented here; set null for now
            gf.setUploader(null);
            gf.setOriginalFilename(original);
            gf.setStoredFilename(stored);
            gf.setContentType(file.getContentType());
            gf.setSize(file.getSize());
            GroupFile saved = fileRepo.save(gf);

            // Persist a GroupMessage via GroupMessageService with messageType FILE if senderId provided
            ChatMessageDTO out = new ChatMessageDTO();
            if (senderId != null) {
                com.studyGroup.backend.dto.ChatMessageDTO dto = new com.studyGroup.backend.dto.ChatMessageDTO();
                dto.setGroupId(groupId);
                dto.setSenderId(senderId);
                dto.setContent(original);
                dto.setMessageType("FILE");
                com.studyGroup.backend.model.GroupMessage savedMsg = messageService.saveMessage(dto);
                out.setMessageId(savedMsg.getId());
                out.setSenderId(savedMsg.getSender().getId());
                out.setSenderName(savedMsg.getSender().getName());
                out.setTimestamp(savedMsg.getTimestamp());
            }
            out.setGroupId(groupId);
            out.setContent(original);
            out.setMessageType("FILE");
            out.setFileId(saved.getId());
            out.setFileName(original);
            out.setFileSize(saved.getSize());
            out.setFileUrl("/api/groups/files/" + saved.getId());

            messagingTemplate.convertAndSend("/topic/group/" + groupId, out);

            return ResponseEntity.ok().build();
        } catch (IOException ex) {
            ex.printStackTrace();
            return ResponseEntity.status(500).body("File upload failed");
        }
    }

    @GetMapping("/files/{fileId}")
    public ResponseEntity<byte[]> downloadFile(@PathVariable Long fileId) {
        try {
            GroupFile gf = fileRepo.findById(fileId).orElseThrow(() -> new RuntimeException("File not found"));
            Path target = storageDir.resolve(gf.getStoredFilename());
            byte[] content = Files.readAllBytes(target);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + gf.getOriginalFilename() + "\"")
                    .contentType(MediaType.parseMediaType(gf.getContentType() == null ? MediaType.APPLICATION_OCTET_STREAM_VALUE : gf.getContentType()))
                    .body(content);
        } catch (IOException e) {
            return ResponseEntity.status(404).body(null);
        }
    }
}
