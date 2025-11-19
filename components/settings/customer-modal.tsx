"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Customer, SalesRep } from "./types";

type CustomerModalProps = {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  reps: SalesRep[];
  onSave: (customerData: Partial<Customer>) => Promise<void>;
  saving: boolean;
};

export function CustomerModal({
  open,
  onClose,
  customer,
  reps,
  onSave,
  saving,
}: CustomerModalProps) {
  const [formData, setFormData] = useState<Partial<Customer>>({
    dealer_name: "",
    rep_id: null,
    dealer_billing_address_city: "",
    dealer_billing_address_state: "",
    dealer_billing_address_postal_code: "",
    dealer_billing_address_postal_country: "",
    dealer_email_1: "",
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        dealer_name: customer.dealer_name,
        rep_id: customer.rep_id,
        dealer_billing_address_city: customer.dealer_billing_address_city || "",
        dealer_billing_address_state: customer.dealer_billing_address_state || "",
        dealer_billing_address_postal_code: customer.dealer_billing_address_postal_code || "",
        dealer_billing_address_postal_country: customer.dealer_billing_address_postal_country || "",
        dealer_email_1: customer.dealer_email_1 || "",
      });
    } else {
      setFormData({
        dealer_name: "",
        rep_id: null,
        dealer_billing_address_city: "",
        dealer_billing_address_state: "",
        dealer_billing_address_postal_code: "",
        dealer_billing_address_postal_country: "",
        dealer_email_1: "",
      });
    }
  }, [customer, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  const filteredReps = reps.filter(
    (rep) =>
      !rep.rep_name.trim().toLowerCase().includes("dismissed") &&
      !rep.rep_name.trim().toLowerCase().includes("intercompany")
  );

  // Format current date/time in EST
  const formatAuditTimestamp = () => {
    const now = new Date();
    const estDate = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(now);
    return `Last update made by [System User] on ${estDate}, EST`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Dealer Name */}
            <div className="col-span-2">
              <Label htmlFor="dealer_name">
                Dealer Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dealer_name"
                value={formData.dealer_name}
                onChange={(e) =>
                  setFormData({ ...formData, dealer_name: e.target.value })
                }
                placeholder="Enter dealer name"
                required
              />
            </div>

            {/* Sales Rep */}
            <div className="col-span-2">
              <Label htmlFor="rep_id">Assigned Sales Rep</Label>
              <Select
                value={formData.rep_id?.toString() || "unassigned"}
                onValueChange={(value) =>
                  setFormData({ ...formData, rep_id: value === "unassigned" ? null : parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a sales rep" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {filteredReps.map((rep) => (
                    <SelectItem key={rep.rep_id} value={rep.rep_id.toString()}>
                      {rep.rep_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.dealer_billing_address_city || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dealer_billing_address_city: e.target.value,
                  })
                }
                placeholder="Enter city"
              />
            </div>

            {/* State */}
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.dealer_billing_address_state || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dealer_billing_address_state: e.target.value,
                  })
                }
                placeholder="Enter state"
              />
            </div>

            {/* Zip Code */}
            <div>
              <Label htmlFor="zip">Zip Code</Label>
              <Input
                id="zip"
                value={formData.dealer_billing_address_postal_code || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dealer_billing_address_postal_code: e.target.value,
                  })
                }
                placeholder="Enter zip code"
              />
            </div>

            {/* Country */}
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.dealer_billing_address_postal_country || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dealer_billing_address_postal_country: e.target.value,
                  })
                }
                placeholder="Enter country"
              />
            </div>

            {/* Email */}
            <div className="col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.dealer_email_1 || ""}
                onChange={(e) =>
                  setFormData({ ...formData, dealer_email_1: e.target.value })
                }
                placeholder="Enter email address"
              />
            </div>
          </div>

          {/* Audit Log */}
          {customer && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground italic">
                {formatAuditTimestamp()}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !formData.dealer_name?.trim()}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : customer ? (
                "Update Customer"
              ) : (
                "Add Customer"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
