import { Topbar } from "@/components/layout/topbar";
import { ItemForm } from "@/components/inventory/item-form";

export const metadata = { title: "Add Item" };

export default function NewItemPage() {
  return (
    <div className="flex flex-col">
      <Topbar title="Add Inventory Item" subtitle="Fill in the details below to add a new item" />
      <div className="max-w-3xl mx-auto w-full p-6">
        <ItemForm />
      </div>
    </div>
  );
}
