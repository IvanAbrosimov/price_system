interface ManufacturerTabsProps {
  tabs: string[]
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function ManufacturerTabs({ 
  tabs, 
  activeTab, 
  onTabChange 
}: ManufacturerTabsProps) {
  return (
    <div className="tabs-container">
      {tabs.map(tab => (
        <button
          key={tab}
          className={`tab-button ${activeTab === tab ? 'active' : ''}`}
          onClick={() => onTabChange(tab)}
          aria-pressed={activeTab === tab}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
