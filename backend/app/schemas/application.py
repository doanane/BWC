from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date, datetime
from app.models.application import ApplicationStatus, ServicePlan, Gender, DeliveryMethod


class ApplicationCreate(BaseModel):
    child_first_name: str
    child_last_name: str
    child_other_names: Optional[str] = None
    child_date_of_birth: date
    child_gender: Gender
    child_place_of_birth: str
    child_region_of_birth: str
    child_district_of_birth: str
    child_nationality: str = "Ghanaian"
    child_birth_order: Optional[int] = None

    father_first_name: Optional[str] = None
    father_last_name: Optional[str] = None
    father_other_names: Optional[str] = None
    father_nationality: Optional[str] = None
    father_date_of_birth: Optional[date] = None
    father_ghana_card: Optional[str] = None
    father_occupation: Optional[str] = None
    father_phone: Optional[str] = None
    father_address: Optional[str] = None

    mother_first_name: str
    mother_last_name: str
    mother_other_names: Optional[str] = None
    mother_nationality: Optional[str] = None
    mother_date_of_birth: Optional[date] = None
    mother_ghana_card: Optional[str] = None
    mother_occupation: Optional[str] = None
    mother_phone: Optional[str] = None
    mother_address: Optional[str] = None

    informant_name: Optional[str] = None
    informant_relationship: Optional[str] = None
    informant_phone: Optional[str] = None
    informant_address: Optional[str] = None

    hospital_name: Optional[str] = None
    hospital_address: Optional[str] = None
    attending_physician: Optional[str] = None

    service_plan: ServicePlan = ServicePlan.NORMAL
    delivery_method: DeliveryMethod = DeliveryMethod.PICKUP

    delivery_address: Optional[str] = None
    delivery_region: Optional[str] = None
    delivery_district: Optional[str] = None
    delivery_digital_address: Optional[str] = None
    delivery_notes: Optional[str] = None

    @field_validator("child_date_of_birth")
    @classmethod
    def validate_dob(cls, v):
        if v > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return v

    @field_validator("child_nationality")
    @classmethod
    def validate_child_nationality(cls, v):
        if (v or "").strip().lower() != "ghanaian":
            raise ValueError("Only Ghanaian birth registrations are accepted")
        return "Ghanaian"


class DeathApplicationCreate(BaseModel):
    deceased_first_name: str
    deceased_last_name: str
    deceased_other_names: Optional[str] = None
    deceased_dob: Optional[date] = None
    date_of_death: date
    place_of_death: Optional[str] = None
    cause_of_death: Optional[str] = None
    death_type: str = "NATURAL"
    gender: Gender
    nationality: Optional[str] = "Ghanaian"
    occupation: Optional[str] = None
    informant_name: str
    informant_relation: Optional[str] = None
    informant_phone: str
    informant_address: Optional[str] = None
    registrant_ghana_card: Optional[str] = None
    region: str
    district: str
    service_plan: ServicePlan = ServicePlan.NORMAL
    delivery_method: DeliveryMethod = DeliveryMethod.PICKUP
    delivery_address: Optional[str] = None
    delivery_region: Optional[str] = None
    delivery_district: Optional[str] = None
    delivery_digital_address: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("date_of_death")
    @classmethod
    def validate_date_of_death(cls, v):
        if v > date.today():
            raise ValueError("Date of death cannot be in the future")
        return v


class ApplicationUpdate(BaseModel):
    child_first_name: Optional[str] = None
    child_last_name: Optional[str] = None
    child_other_names: Optional[str] = None
    child_date_of_birth: Optional[date] = None
    child_gender: Optional[Gender] = None
    child_place_of_birth: Optional[str] = None
    child_region_of_birth: Optional[str] = None
    child_district_of_birth: Optional[str] = None
    father_first_name: Optional[str] = None
    father_last_name: Optional[str] = None
    father_ghana_card: Optional[str] = None
    father_phone: Optional[str] = None
    mother_first_name: Optional[str] = None
    mother_last_name: Optional[str] = None
    mother_ghana_card: Optional[str] = None
    mother_phone: Optional[str] = None
    informant_name: Optional[str] = None
    informant_relationship: Optional[str] = None
    informant_phone: Optional[str] = None
    hospital_name: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_region: Optional[str] = None
    delivery_district: Optional[str] = None
    delivery_digital_address: Optional[str] = None
    delivery_notes: Optional[str] = None
    delivery_method: Optional[DeliveryMethod] = None
    service_plan: Optional[ServicePlan] = None


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
    reason: Optional[str] = None
    staff_notes: Optional[str] = None
    additional_info_request: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: int
    application_number: str
    applicant_id: int
    status: ApplicationStatus
    service_plan: ServicePlan
    delivery_method: DeliveryMethod
    child_first_name: str
    child_last_name: str
    child_other_names: Optional[str] = None
    child_date_of_birth: date
    child_gender: Gender
    child_place_of_birth: str
    child_region_of_birth: str
    child_district_of_birth: str
    child_nationality: str
    father_first_name: Optional[str] = None
    father_last_name: Optional[str] = None
    father_ghana_card: Optional[str] = None
    father_phone: Optional[str] = None
    mother_first_name: str
    mother_last_name: str
    mother_ghana_card: Optional[str] = None
    mother_phone: Optional[str] = None
    hospital_name: Optional[str] = None
    processing_fee: float
    delivery_fee: float
    total_fee: float
    rejection_reason: Optional[str] = None
    additional_info_request: Optional[str] = None
    expected_ready_date: Optional[datetime] = None
    ready_at: Optional[datetime] = None
    collection_deadline: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    printed_at: Optional[datetime] = None
    collected_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ApplicationListResponse(BaseModel):
    id: int
    application_number: str
    applicant_id: int
    status: ApplicationStatus
    service_plan: ServicePlan
    child_first_name: str
    child_last_name: str
    child_date_of_birth: date
    child_gender: Gender
    total_fee: float
    submitted_at: Optional[datetime] = None
    expected_ready_date: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApplicationSearchParams(BaseModel):
    application_number: Optional[str] = None
    status: Optional[ApplicationStatus] = None
    service_plan: Optional[ServicePlan] = None
    search: Optional[str] = None
    child_first_name: Optional[str] = None
    child_last_name: Optional[str] = None
    applicant_id: Optional[int] = None
    region: Optional[str] = None
    district: Optional[str] = None
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    page: int = 1
    page_size: int = 20
