CREATE INDEX "Ticket_categoryId_status_createdAt_idx" ON "Ticket"("categoryId", "status", "createdAt");
CREATE INDEX "TicketTerm_termId_idx" ON "TicketTerm"("termId");
