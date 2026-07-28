"""Chat transcript PDF generator for Drishti Copilot.

Usage::

    from backend.pdf.chat_transcript import ChatTranscriptPDF
    pdf = ChatTranscriptPDF()
    pdf.add_chat_transcript(messages, session_info)
    pdf.output("transcript.pdf")
"""

from __future__ import annotations

import io
import logging
from datetime import datetime
from typing import Any

from fpdf import FPDF

logger = logging.getLogger("nj.pdf.chat_transcript")

# Colour palette - same as FIR report
KSP_NAVY = (12, 25, 41)
KSP_GOLD = (245, 158, 11)
KSP_WHITE = (232, 237, 245)
KSP_MUTED = (107, 125, 158)
KSP_RED = (239, 68, 68)
KSP_GREEN = (34, 197, 94)


class ChatTranscriptPDF(FPDF):
    """A4 PDF generator for chat transcript reports."""

    def __init__(self) -> None:
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_auto_page_break(auto=True, margin=20)

    def add_chat_transcript(self, messages: list[dict[str, Any]], session_info: dict[str, Any]) -> None:
        """Generate a chat transcript PDF from messages and session info."""
        self.alias_nb_pages()
        self.set_title(f"Chat Transcript - {session_info.get('session_id', 'Session')}")

        # Header
        self._add_header(session_info)

        # Session info
        self._add_session_info(session_info)

        self.ln(10)

        # Messages
        self._add_messages(messages)

        # Footer
        self._add_footer()

    def _add_header(self, session_info: dict[str, Any]) -> None:
        """Add PDF header."""
        self.add_page()
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*KSP_NAVY)
        self.cell(0, 10, "Drishti Copilot - Chat Transcript", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*KSP_MUTED)
        self.cell(0, 6, "AI-Powered Investigation Assistant", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(5)

    def _add_session_info(self, session_info: dict[str, Any]) -> None:
        """Add session information."""
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*KSP_NAVY)
        self.cell(0, 8, "Session Information", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

        self.set_font("Helvetica", "", 10)
        self.set_text_color(*KSP_MUTED)

        fields = [
            ("Session ID", session_info.get("session_id", "N/A")),
            ("Type", session_info.get("session_type", "N/A")),
            ("Title", session_info.get("title", "N/A")),
            ("Created", session_info.get("created_at", "N/A")),
            ("Messages", str(session_info.get("message_count", 0))),
        ]

        for label, value in fields:
            self.set_font("Helvetica", "B", 9)
            self.set_text_color(*KSP_NAVY)
            self.cell(45, 5, label, border=0)
            self.set_font("Helvetica", "", 9)
            self.set_text_color(*KSP_MUTED)
            self.cell(0, 5, str(value), new_x="LMARGIN", new_y="NEXT")

    def _add_messages(self, messages: list[dict[str, Any]]) -> None:
        """Add chat messages to the PDF."""
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*KSP_NAVY)
        self.cell(0, 8, "Conversation", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

        for i, msg in enumerate(messages):
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            timestamp = msg.get("created_at", "")
            intent = msg.get("intent", "")

            # Message header
            self.set_font("Helvetica", "B", 9)
            self.set_text_color(*KSP_NAVY)
            self.cell(0, 6, f"Message {i + 1}: {role.toUpperCase()} - {timestamp}", new_x="LMARGIN", new_y="NEXT")
            if intent:
                self.set_font("Helvetica", "", 8)
                self.set_text_color(*KSP_MUTED)
                self.cell(0, 4, f"Intent: {intent}", new_x="LMARGIN", new_y="NEXT")
            self.ln(2)

            # Message content
            self.set_font("Helvetica", "", 9)
            self.set_text_color(*KSP_NAVY)

            # Format content for PDF display
            lines = self._wrap_text(content, 180)
            for line in lines:
                self.multi_cell(0, 4, line)

            self.ln(4)

            # Separator
            self.set_draw_color(*KSP_MUTED)
            self.set_line_width(0.2)
            self.line(15, self.get_y(), 195, self.get_y())
            self.ln(2)

    def _wrap_text(self, text: str, max_width: int) -> list[str]:
        """Wrap text to fit within max_width."""
        words = text.split()
        lines = []
        current_line = []
        current_length = 0

        for word in words:
            if current_length + len(word) + len(current_line) > max_width:
                if current_line:
                    lines.append(current_line)
                    current_line = [word]
                    current_length = len(word)
                else:
                    # Word is longer than max_width, just add it anyway
                    lines.append(word)
            else:
                current_line.append(word)
                current_length += len(word)

        if current_line:
            lines.append(current_line)

        # Join lines into strings
        return [" ".join(line) for line in lines]

    def _add_footer(self) -> None:
        """Add PDF footer."""
        self.set_y(-15)
        self.set_font("Helvetica", "I", 6)
        self.set_text_color(*KSP_MUTED)
        self.cell(0, 10, "Generated by Neural Justice - Drishti Copilot System", align="C")
        self.cell(0, 10, f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", align="C")


def generate_chat_transcript_pdf(messages: list[dict[str, Any]], session_info: dict[str, Any]) -> bytes:
    """Generate a chat transcript PDF and return the bytes.

    This is the main entry point for the API layer.
    """
    pdf = ChatTranscriptPDF()
    pdf.add_chat_transcript(messages, session_info)

    buf = io.BytesIO()
    pdf.output(buf)
    buf.seek(0)
    return buf.getvalue()
