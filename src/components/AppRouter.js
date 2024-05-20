import {Serianilla} from "../../framework/Serianilla.js";

export const AppRouter = (props) => {
    const defaultRoute = props.defaultPath
        ? props.routes.find(r => r.path === props.defaultPath)
        : props.routes[0];

    const [route, setRoute] = Serianilla.useState(defaultRoute);
    const [query, setQuery] = Serianilla.useState('');

    const popStateRef = Serianilla.useRef(null);

    const handleNewPathname = (path) => {
        const newRoute = props.routes.find(r => r.path === path) ?? props.routes.at(-1);
        const pathWithQuery = newRoute.path + query;
        history.pushState({}, '', pathWithQuery);
        setRoute(newRoute);
    }

    if (!popStateRef.current) {
        popStateRef.current = {};

        history.replaceState({}, '', defaultRoute.path);

        window.addEventListener('popstate', () => {
            const path = location.pathname;
            handleNewPathname(path);
        });
    }

    const imports = [route.component];

    const template = `<${route.component.name} locationContext={locationContext}/>`;

    const attach = {
        locationContext: {
            pathname: route.path,
            search: query,
            setPathname: handleNewPathname,
            setQuery: setQuery,
        },
    };

    return {imports, template, attach, hasDynamicInterpolation: true};
}