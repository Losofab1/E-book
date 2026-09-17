package com.example.Biblioth.notification;
import com.example.Biblioth.Config.ResourceNotFoundException; import java.time.LocalDateTime; import java.util.List; import java.util.Map; import org.springframework.http.ResponseEntity; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/notifications") public class NotificationController {
 private final NotificationRepository repository; public NotificationController(NotificationRepository repository){this.repository=repository;}
 @GetMapping public List<Map<String,Object>> list(Authentication auth){return repository.findByRecipientEmailIsNullOrRecipientEmailOrderByCreatedAtDesc(auth.getName()).stream().map(n->Map.<String,Object>of("id",n.getId(),"type",n.getType(),"message",n.getMessage(),"createdAt",n.getCreatedAt(),"read",n.getReadAt()!=null)).toList();}
 @PatchMapping("/{id}/read") public ResponseEntity<Void> read(@PathVariable Long id, Authentication auth){Notification n=repository.findById(id).orElseThrow(()->new ResourceNotFoundException("Notification introuvable."));if(n.getRecipientEmail()!=null&&!n.getRecipientEmail().equalsIgnoreCase(auth.getName()))return ResponseEntity.status(403).build();n.setReadAt(LocalDateTime.now());repository.save(n);return ResponseEntity.noContent().build();}
}
