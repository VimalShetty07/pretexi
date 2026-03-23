from pydantic import BaseModel, ConfigDict, Field


class DocFileOut(BaseModel):
    id: str
    file_name: str
    status: str
    upload_date: str | None


class ChecklistItemOut(BaseModel):
    id: str
    item_number: int
    description: str
    category: str | None = None
    status: str
    rejection_reason: str | None
    documents: list[DocFileOut]


class TemplateItemIn(BaseModel):
    description: str = Field(..., min_length=1, max_length=2000)
    category: str | None = Field(None, max_length=128)
    sort_order: int = 0


class ChecklistTemplatePut(BaseModel):
    items: list[TemplateItemIn]


class ChecklistTemplateItemOut(BaseModel):
    id: str
    sort_order: int
    description: str
    category: str | None


class TokenUser(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sub: str | None = None
    organisation_id: str | None = None
    role: str | None = None
