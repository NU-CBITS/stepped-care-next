class CreateUsers < ActiveRecord::Migration
  def change
    create_table :users do |t|
      t.string :study_id
      t.string :group_id
      t.string :username
      t.string :study_role
      t.text :contact_info
      t.string :start_date
      t.string :transmitted_at
      t.string :received_at
      t.string :guid

      t.timestamps
    end
  end
end
