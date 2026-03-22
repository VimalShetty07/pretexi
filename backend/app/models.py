import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class ItemStatus(str, enum.Enum):
    not_started = "not_started"
    uploaded = "uploaded"
    verified = "verified"
    rejected = "rejected"
    not_applicable = "not_applicable"


class ChecklistTemplateItem(Base):
    __tablename__ = "checklist_template_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organisation_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(128), nullable=True)

    states: Mapped[list["ChecklistItemState"]] = relationship(
        "ChecklistItemState", back_populates="template_item", cascade="all, delete-orphan"
    )


class ChecklistItemState(Base):
    __tablename__ = "checklist_item_states"
    __table_args__ = (UniqueConstraint("worker_id", "template_item_id", name="uq_worker_template_item"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    organisation_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    template_item_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("checklist_template_items.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default=ItemStatus.not_started.value)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    template_item: Mapped["ChecklistTemplateItem"] = relationship("ChecklistTemplateItem", back_populates="states")
    documents: Mapped[list["ChecklistDocument"]] = relationship(
        "ChecklistDocument", back_populates="state", cascade="all, delete-orphan"
    )


class ChecklistDocument(Base):
    __tablename__ = "checklist_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    state_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("checklist_item_states.id", ondelete="CASCADE"), nullable=False
    )
    file_name: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="uploaded")
    upload_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    state: Mapped["ChecklistItemState"] = relationship("ChecklistItemState", back_populates="documents")
