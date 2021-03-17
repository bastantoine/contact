import $ from "jquery"
import { Component } from "react";

import { API_ENDPOINT } from "../config";
import { join } from "../utils";

type PropsType = {}
type StateType = {
    isLoaded: boolean,
    error: null | JQuery.jqXHR,
    contacts: any[],
}

class Home extends Component<PropsType, StateType> {

    constructor(props: PropsType) {
        super(props);
        this.state = {
            isLoaded: false,
            error: null,
            contacts: []
        }
    }

    componentDidMount() {
        $.get(join(API_ENDPOINT, 'contact'))
            .done((contacts) => {
                this.setState({
                    contacts: contacts,
                    isLoaded: true
                });
            })
            .fail((error) => {
                this.setState({
                    error: error,
                    isLoaded: false
                });
            });
    }

    render() {
        return "Hello from Home component!";
    }
}

export default Home