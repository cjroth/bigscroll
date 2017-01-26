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

        this.virtualCells = new Proxy([], {
            deleteProperty: (target, property) => {
                this.element.removeChild(target[property])
                return true
            },
            set: (target, property, value, receiver) => {
                target[property] = value
                if (/^\d+$/.test(property)) {
                    this.element.appendChild(value)
                }
                return true
            }
        })

        this.data = new Proxy(this.data, {
            deleteProperty: (target, property) => {
                delete target[property]
                this.fitData()
                return true
            },
            set: (target, property, value, receiver) => {
                target[property] = value
                if (/^\d+$/.test(property)) {
                    this.fitData()
                }
                return true
            }
        })

        this.maximumDisplayCount = Math.floor(maximumBodyHeight / this.cellHeight)
        this.currentIndex = this.element.parentElement.scrollTop / this.cellHeight

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
        this.fitData()

        this.element.parentElement.addEventListener('scroll', event => {
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

    fitData() {
        if (this.data.length > this.maximumDisplayCount) {
            console.warn(`Data is being truncated because the maximum number or rows is ${this.data.length} (data.length) / ${this.cellHeight}px (cellHeight) = ~${this.maximumDisplayCount}.`)
            this.data.length = this.maximumDisplayCount
        }
        this.element.style.height = this.data.length * this.cellHeight
        this.updateVirtualCells()
    }

    adjustVirtualCells() {
        let count = Math.ceil(this.element.parentElement.clientHeight / this.cellHeight) + 1
        while (this.virtualCells.length < count) {
            let cell = this.cell.cloneNode()
            cell.addEventListener('blur', event => {
                if (String(event.target.__rawValue) !== event.target.innerHTML) {
                    switch (event.target.__type) {
                        case 'string':
                            this.data[event.target.__index] = event.target.innerHTML
                            break
                        case 'number':
                            this.data[event.target.__index] = parseFloat(event.target.innerHTML)
                            break
                        case 'boolean':
                            this.data[event.target.__index] = !!event.target.innerHTML
                            break
                    }
                }
            })

            this.virtualCells.push(cell)
        }
        while (this.virtualCells.length > count) {
            let cell = this.virtualCells[this.virtualCells.length - 1]
            this.virtualCells.pop()
        }
        if (this.debug) {
            this.updateDebugBox({
                'virtualCells.length': this.virtualCells.length
            })
        }
    }

    updateVirtualCells() {
        let paddingTop = this.currentIndex * this.cellHeight
        this.element.style.paddingTop = `${paddingTop}px`
        for (let i in this.virtualCells) {
            let cell = this.virtualCells[i]
            let index = this.currentIndex + parseInt(i)
            let value = this.data[index]
            if (value !== cell.__rawValue) {
                cell.__rawValue = value
                cell.__index = index
                cell.__type = typeof value
                this.update(cell, value)
            }
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
