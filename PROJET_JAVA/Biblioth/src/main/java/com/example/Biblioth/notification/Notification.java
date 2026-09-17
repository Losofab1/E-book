package com.example.Biblioth.notification;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity @Table(name = "notifications")
public class Notification {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 private String recipientEmail; @Column(nullable=false) private String message; @Column(nullable=false) private String type; private LocalDateTime readAt; @Column(nullable=false) private LocalDateTime createdAt;
 public Long getId(){return id;} public String getRecipientEmail(){return recipientEmail;} public void setRecipientEmail(String v){recipientEmail=v;} public String getMessage(){return message;} public void setMessage(String v){message=v;} public String getType(){return type;} public void setType(String v){type=v;} public LocalDateTime getReadAt(){return readAt;} public void setReadAt(LocalDateTime v){readAt=v;} public LocalDateTime getCreatedAt(){return createdAt;} public void setCreatedAt(LocalDateTime v){createdAt=v;}
}
