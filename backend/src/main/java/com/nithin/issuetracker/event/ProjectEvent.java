package com.nithin.issuetracker.event;

/**
 * Published by services after a change; broadcast over WebSocket to /topic/projects/{projectId}
 * once the transaction commits. Carries ids only - clients refetch what they need.
 */
public record ProjectEvent(Long projectId, String type, Long ticketId, Long actorId) {
}
