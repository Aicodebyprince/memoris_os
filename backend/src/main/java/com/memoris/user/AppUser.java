package com.memoris.user;

import com.memoris.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "app_users")
public class AppUser extends BaseEntity {
    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    protected AppUser() {
    }

    public AppUser(String fullName, String email, String passwordHash) {
        this.fullName = fullName;
        this.email = email.toLowerCase();
        this.passwordHash = passwordHash;
    }

    public void updateDemoProfile(String fullName, String passwordHash) {
        this.fullName = fullName;
        this.passwordHash = passwordHash;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }
}
