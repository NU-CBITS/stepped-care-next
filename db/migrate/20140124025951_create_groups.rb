class CreateGroups < ActiveRecord::Migration
  def change
    create_table :groups do |t|
      t.string :name
      t.string :start_date
      t.string :lockout_date
      t.string :transmitted_at
      t.string :version_id
      t.string :received_at
      t.string :guid

      t.timestamps
    end
  end
end
