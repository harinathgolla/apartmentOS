package com.apartment.security;
public record AuthDetails(Long userId, Long orgId, String role, Long apartmentId) {}
