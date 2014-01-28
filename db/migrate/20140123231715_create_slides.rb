class CreateSlides < ActiveRecord::Migration
  def change
    create_table :slides do |t|
      t.string :guid
      t.string :version_id
      t.string :received_at
      t.string :title
      t.text :content

      t.timestamps
    end
  end
end
