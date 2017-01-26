const maximumBodyHeight = 16777200

class VirtualScroll {
    constructor(options) {

        Object.assign(this, {
            element: document.getElementById('body'),
            data: [],
            cellHeight: 50,
            debug: false,
            cell: document.createElement('div'),
            update: (cell, value) => {
                cell.innerHTML = value || ''
            }
        }, options)
        this.virtualCells = []
        this.maximumDisplayCount = Math.floor(maximumBodyHeight / this.cellHeight)
        this.currentIndex = this.element.parentElement.scrollTop / this.cellHeight

        if (this.data.length > this.maximumDisplayCount) {
            console.warn(`Data is being truncated because the maximum number or rows is ${this.data.length} (data.length) / ${this.cellHeight}px (cellHeight) = ~${this.maximumDisplayCount}.`)
            this.data.length = this.maximumDisplayCount
        }

        this.element.style.height = this.data.length * this.cellHeight
        this.element.style.boxSizing = 'border-box'
        this.element.parentElement.style.overflow = 'scroll'
        this.element.style.overflow = 'hidden'

        this.updateDebugBox = VirtualScroll.createDebugBox({
            'data.length': this.data.length,
            'virtualCells.length': this.virtualCells.length,
            'cellHeight': this.cellHeight,
            'currentIndex': this.currentIndex
        })

        this.adjustVirtualCells()
        this.updateVirtualCells()

        this.element.parentElement.addEventListener('scroll', event => {
            console.log('scroll')
            this.currentIndex = Math.floor(this.element.parentElement.scrollTop / this.cellHeight)
            this.updateVirtualCells()
            this.updateDebugBox({
                'currentIndex': this.currentIndex
            })
        })

        window.addEventListener('resize', event => {
            this.adjustVirtualCells()
            this.updateVirtualCells()
        })

    }

    adjustVirtualCells() {
        let count = Math.ceil(this.element.parentElement.clientHeight / this.cellHeight) + 1
        while (this.virtualCells.length < count) {
            let cell = this.createVirtualCell()
            this.virtualCells.push(cell)
        }
        while (this.virtualCells.length > count) {
            let cell = this.virtualCells[this.virtualCells.length - 1]
            this.removeVirtualCell(cell)
            this.virtualCells.pop()
        }
        if (this.debug) {
            this.updateDebugBox({
                'virtualCells.length': this.virtualCells.length
            })
        }
    }

    createVirtualCell() {
        let cell = this.cell.cloneNode()
        this.element.appendChild(cell)
        return cell
    }

    removeVirtualCell(cell) {
        this.element.removeChild(cell)
    }

    updateVirtualCells() {
        let paddingTop = this.currentIndex * this.cellHeight
        this.element.style.paddingTop = `${paddingTop}px`
        for (let i in this.virtualCells) {
            let cell = this.virtualCells[i]
            let value = this.data[this.currentIndex + ~~i]
            this.update(cell, value)
        }
    }

    getMaximumDisplayCount() {
        return Math.floor(maximumBodyHeight / this.cellHeight)
    }

    static createDebugBox(variables) {
        let update = {}
        let dl = document.createElement('dl')
        dl.setAttribute('id', 'debug')
        document.body.appendChild(dl)
        for (let name in variables) {
            let value = variables[name]
            update[name] = addVariable(name, value)
        }
        function addVariable(name, value) {
            let dt = document.createElement('dt')
            dt.setAttribute('data-variable', name)
            dt.innerHTML = name
            dl.appendChild(dt)
            let dd = document.createElement('dd')
            dd.setAttribute('data-variable', name)
            dd.innerHTML = value
            dl.appendChild(dd)
            return function(newValue) {
                dd.innerHTML = newValue
            }
        }
        return function(variablesToUpdate) {
            for (let name in variablesToUpdate) {
                let value = variablesToUpdate[name]
                if (update[name]) {
                    update[name](value)
                } else {
                    addVariable(name, value)
                }
            }
        }
    }
}
