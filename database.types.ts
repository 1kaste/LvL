export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      activity_logs: {
        Row: {
          description: string
          details: string
          id: string
          timestamp: string
          type: string
          user_id: string
          user_name: string
        }
        Insert: {
          description: string
          details?: string
          id?: string
          timestamp?: string
          type: string
          user_id: string
          user_name: string
        }
        Update: {
          description?: string
          details?: string
          id?: string
          timestamp?: string
          type?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      categories: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      deductions: {
        Row: {
          amount: number
          date: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          date?: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          date?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deductions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      discounts: {
        Row: {
          id: string
          is_active: boolean
          name: string
          product_ids: string[] | null
          type: "percentage" | "fixed"
          value: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
          product_ids?: string[] | null
          type: "percentage" | "fixed"
          value: number
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          product_ids?: string[] | null
          type?: "percentage" | "fixed"
          value?: number
        }
        Relationships: []
      }
      keg_instances: {
        Row: {
          capacity: number
          closed_by_id: string | null
          closed_date: string | null
          current_volume: number
          id: string
          product_id: string
          sales: Json | null
          status: "Full" | "Tapped" | "Empty"
          tapped_by_id: string | null
          tapped_date: string | null
        }
        Insert: {
          capacity: number
          closed_by_id?: string | null
          closed_date?: string | null
          current_volume: number
          id: string
          product_id: string
          sales?: Json | null
          status: "Full" | "Tapped" | "Empty"
          tapped_by_id?: string | null
          tapped_date?: string | null
        }
        Update: {
          capacity?: number
          closed_by_id?: string | null
          closed_date?: string | null
          current_volume?: number
          id?: string
          product_id?: string
          sales?: Json | null
          status?: "Full" | "Tapped" | "Empty"
          tapped_by_id?: string | null
          tapped_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keg_instances_closed_by_id_fkey"
            columns: ["closed_by_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keg_instances_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keg_instances_tapped_by_id_fkey"
            columns: ["tapped_by_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      payment_methods: {
        Row: {
          details: string
          id: string
          name: string
          show_on_receipt: boolean
        }
        Insert: {
          details: string
          id: string
          name: string
          show_on_receipt: boolean
        }
        Update: {
          details?: string
          id?: string
          name?: string
          show_on_receipt?: boolean
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          id: string
          keg_capacity: number | null
          keg_capacity_unit: string | null
          linked_keg_product_id: string | null
          low_stock_threshold: number
          name: string
          price: number
          product_type: "Stocked" | "Service" | "Keg"
          serving_size: number | null
          serving_size_unit: string | null
          stock: number
        }
        Insert: {
          category_id?: string | null
          id?: string
          keg_capacity?: number | null
          keg_capacity_unit?: string | null
          linked_keg_product_id?: string | null
          low_stock_threshold?: number
          name: string
          price: number
          product_type: "Stocked" | "Service" | "Keg"
          serving_size?: number | null
          serving_size_unit?: string | null
          stock: number
        }
        Update: {
          category_id?: string | null
          id?: string
          keg_capacity?: number | null
          keg_capacity_unit?: string | null
          linked_keg_product_id?: string | null
          low_stock_threshold?: number
          name?: string
          price?: number
          product_type?: "Stocked" | "Service" | "Keg"
          serving_size?: number | null
          serving_size_unit?: string | null
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          clock_in_time: string | null
          email: string
          id: string
          name: string
          override_pin: string | null
          pin: string | null
          role: "Admin" | "Manager" | "Cashier" | "Server/bartender"
          salary_amount: number | null
          time_clock_status: "Clocked In" | "Clocked Out" | "Awaiting Clearance"
        }
        Insert: {
          clock_in_time?: string | null
          email: string
          id: string
          name: string
          override_pin?: string | null
          pin?: string | null
          role: "Admin" | "Manager" | "Cashier" | "Server/bartender"
          salary_amount?: number | null
          time_clock_status?: "Clocked In" | "Clocked Out" | "Awaiting Clearance"
        }
        Update: {
          clock_in_time?: string | null
          email?: string
          id?: string
          name?: string
          override_pin?: string | null
          pin?: string | null
          role?: "Admin" | "Manager" | "Cashier" | "Server/bartender"
          salary_amount?: number | null
          time_clock_status?: "Clocked In" | "Clocked Out" | "Awaiting Clearance"
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          cost: number
          id: number
          po_id: string
          product_id: string
          quantity_ordered: number
          quantity_received: number
        }
        Insert: {
          cost: number
          id?: number
          po_id: string
          product_id: string
          quantity_ordered: number
          quantity_received?: number
        }
        Update: {
          cost?: number
          id?: number
          po_id?: string
          product_id?: string
          quantity_ordered?: number
          quantity_received?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      purchase_orders: {
        Row: {
          id: string
          invoice_no: string | null
          order_date: string
          received_by_id: string | null
          received_date: string | null
          status: "Pending" | "Partially Received" | "Received" | "Cancelled"
          supplier_id: string
          total_cost: number
        }
        Insert: {
          id: string
          invoice_no?: string | null
          order_date: string
          received_by_id?: string | null
          received_date?: string | null
          status: "Pending" | "Partially Received" | "Received" | "Cancelled"
          supplier_id: string
          total_cost: number
        }
        Update: {
          id?: string
          invoice_no?: string | null
          order_date?: string
          received_by_id?: string | null
          received_date?: string | null
          status?: "Pending" | "Partially Received" | "Received" | "Cancelled"
          supplier_id?: string
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_received_by_id_fkey"
            columns: ["received_by_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          }
        ]
      }
      sale_items: {
        Row: {
          id: number
          price_at_sale: number
          product_id: string
          product_name: string
          quantity: number
          sale_id: string
        }
        Insert: {
          id?: number
          price_at_sale: number
          product_id: string
          product_name: string
          quantity: number
          sale_id: string
        }
        Update: {
          id?: number
          price_at_sale?: number
          product_id?: string
          product_name?: string
          quantity?: number
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            referencedRelation: "sales"
            referencedColumns: ["id"]
          }
        ]
      }
      sales: {
        Row: {
          customer_type: string
          date: string
          discount_amount: number | null
          discount_name: string | null
          id: string
          payment_method: "cash" | "card" | "mpesa"
          served_by_id: string
          served_by_name: string
          subtotal: number
          tax: number
          total: number
        }
        Insert: {
          customer_type: string
          date: string
          discount_amount?: number | null
          discount_name?: string | null
          id: string
          payment_method: "cash" | "card" | "mpesa"
          served_by_id: string
          served_by_name: string
          subtotal: number
          tax: number
          total: number
        }
        Update: {
          customer_type?: string
          date?: string
          discount_amount?: number | null
          discount_name?: string | null
          id?: string
          payment_method?: "cash" | "card" | "mpesa"
          served_by_id?: string
          served_by_name?: string
          subtotal?: number
          tax?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_served_by_id_fkey"
            columns: ["served_by_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      scheduled_shifts: {
        Row: {
          date: string
          end_time: string
          id: string
          start_time: string
          user_id: string
        }
        Insert: {
          date: string
          end_time: string
          id: string
          start_time: string
          user_id: string
        }
        Update: {
          date?: string
          end_time?: string
          id?: string
          start_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_shifts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      store_settings: {
        Row: {
          address: string
          auto_lock_on_print: boolean
          email: string
          id: number
          logo_url: string
          pdf_footer_logo_url: string
          pdf_footer_text: string
          phone: string
          receipt_footer: string
          receipt_header: string
          show_logo_on_receipt: boolean
          show_pdf_footer: boolean
          store_name: string
          system_lock_pin: string
        }
        Insert: {
          address: string
          auto_lock_on_print: boolean
          email: string
          id?: number
          logo_url: string
          pdf_footer_logo_url: string
          pdf_footer_text: string
          phone: string
          receipt_footer: string
          receipt_header: string
          show_logo_on_receipt: boolean
          show_pdf_footer: boolean
          store_name: string
          system_lock_pin: string
        }
        Update: {
          address?: string
          auto_lock_on_print?: boolean
          email?: string
          id?: number
          logo_url?: string
          pdf_footer_logo_url?: string
          pdf_footer_text?: string
          phone?: string
          receipt_footer?: string
          receipt_header?: string
          show_logo_on_receipt?: boolean
          show_pdf_footer?: boolean
          store_name?: string
          system_lock_pin?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          contact_person: string
          email: string
          id: string
          mpesa_paybill: string | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string
        }
        Insert: {
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          contact_person: string
          email: string
          id: string
          mpesa_paybill?: string | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone: string
        }
        Update: {
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          contact_person?: string
          email?: string
          id?: string
          mpesa_paybill?: string | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string
        }
        Relationships: []
      }
      time_logs: {
        Row: {
          approved_by_id: string | null
          clock_in_time: string
          clock_out_time: string | null
          counted_amount: number | null
          declared_amount: number | null
          difference: number | null
          duration_hours: number | null
          expected_sales: Json | null
          id: string
          rejection_reason: string | null
          status:
            | "Ongoing"
            | "Completed"
            | "Pending Approval"
            | "Rejected"
          user_id: string
        }
        Insert: {
          approved_by_id?: string | null
          clock_in_time: string
          clock_out_time?: string | null
          counted_amount?: number | null
          declared_amount?: number | null
          difference?: number | null
          duration_hours?: number | null
          expected_sales?: Json | null
          id: string
          rejection_reason?: string | null
          status:
            | "Ongoing"
            | "Completed"
            | "Pending Approval"
            | "Rejected"
          user_id: string
        }
        Update: {
          approved_by_id?: string | null
          clock_in_time?: string
          clock_out_time?: string | null
          counted_amount?: number | null
          declared_amount?: number | null
          difference?: number | null
          duration_hours?: number | null
          expected_sales?: Json | null
          id?: string
          rejection_reason?: string | null
          status?:
            | "Ongoing"
            | "Completed"
            | "Pending Approval"
            | "Rejected"
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_approved_by_id_fkey"
            columns: ["approved_by_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}